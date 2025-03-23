import shapely.geometry as sg
import pyproj
from shapely.ops import transform
from functools import partial
import json
import os


class PolygonManager:
    def __init__(self, storage_file=None):
        """
        Инициализирует менеджер полигонов

        Args:
            storage_file: Путь к файлу для хранения полигонов (опционально)
        """
        self.polygons = {}  # id -> polygon_data
        self.current_id = 0
        self.storage_file = storage_file

        # Загружаем данные из файла, если указан
        if storage_file and os.path.exists(storage_file):
            self.load_from_file()

    def add_polygon(self, coords, properties=None):
        """
        Добавляет новый полигон и возвращает его ID
        """
        polygon_id = str(self.current_id)
        self.current_id += 1

        # Создаем объект полигона
        polygon_data = {
            'coordinates': coords,
            'properties': properties or {},
            'area_ha': calculate_polygon_area(coords)
        }

        # Сохраняем полигон
        self.polygons[polygon_id] = polygon_data

        # Сохраняем в файл, если указан
        if self.storage_file:
            self.save_to_file()

        return polygon_id

    def get_polygon(self, polygon_id):
        """Возвращает данные полигона по id"""
        return self.polygons.get(polygon_id)

    def get_all_polygons(self):
        """Возвращает все полигоны"""
        return self.polygons

    def clear_all(self):
        """Удаляет все полигоны"""
        self.polygons = {}

        # Сохраняем в файл, если указан
        if self.storage_file:
            self.save_to_file()

    def save_to_file(self):
        """Сохраняет данные полигонов в файл"""
        with open(self.storage_file, 'w') as f:
            json.dump({
                'current_id': self.current_id,
                'polygons': self.polygons
            }, f)

    def load_from_file(self):
        """Загружает данные полигонов из файла"""
        try:
            with open(self.storage_file, 'r') as f:
                data = json.load(f)
                self.current_id = data.get('current_id', 0)
                self.polygons = data.get('polygons', {})
        except Exception as e:
            print(f"Ошибка загрузки данных полигонов: {e}")

    def to_geojson(self):
        """Конвертирует все полигоны в формат GeoJSON"""
        features = []

        for polygon_id, polygon_data in self.polygons.items():
            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [polygon_data['coordinates']]
                },
                'properties': {
                    'id': polygon_id,
                    'area_ha': polygon_data['area_ha'],
                    **polygon_data['properties']
                }
            }
            features.append(feature)

        geojson = {
            'type': 'FeatureCollection',
            'features': features
        }

        return json.dumps(geojson)


def calculate_polygon_area(coords):
    """
    Рассчитывает площадь полигона в гектарах
    """
    # Создаем полигон через Shapely
    polygon = sg.Polygon(coords)

    # Определяем центр полигона для UTM проекции
    centroid = polygon.centroid
    lon, lat = centroid.x, centroid.y

    # Выбираем подходящую UTM зону
    utm_zone = int(((lon + 180) / 6) % 60) + 1
    epsg_code = 32600 + utm_zone
    if lat < 0:
        epsg_code += 100  # Южное полушарие

    wgs84 = pyproj.CRS('EPSG:4326')
    utm = pyproj.CRS(f'EPSG:{epsg_code}')

    # Создаем преобразование координат
    project = pyproj.Transformer.from_crs(wgs84, utm, always_xy=True).transform

    # Трансформируем полигон в UTM для точного расчета площади
    polygon_utm = transform(project, polygon)

    # Рассчитываем площадь в квадратных метрах
    area_m2 = polygon_utm.area

    # Переводим в гектары (1 га = 10000 м²)
    area_ha = area_m2 / 10000

    return round(area_ha, 2)