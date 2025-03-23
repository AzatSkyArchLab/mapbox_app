// Модуль для управления видимостью зданий под полигоном

// Флаг для отслеживания состояния маскирующего слоя
let maskActive = false;

// Функция для создания маски поверх зданий
function createBuildingMask(polygonCoords) {
    // Удаляем предыдущую маску, если она существует
    removeBuildingMask();

    console.log('Создание маски для зданий с координатами', polygonCoords);

    try {
        // Создаем источник данных для маски
        map.addSource('building-mask-source', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [polygonCoords]
                },
                properties: {}
            }
        });

        // Добавляем слой маски
        map.addLayer({
            'id': 'building-mask-fill',
            'type': 'fill-extrusion',
            'source': 'building-mask-source',
            'paint': {
                'fill-extrusion-color': '#000',  // Черный цвет
                'fill-extrusion-opacity': 1,
                'fill-extrusion-height': 1000,   // Высота маски (выше зданий)
                'fill-extrusion-base': 0         // База маски (на уровне земли)
            }
        });

        // Устанавливаем флаг активности маски
        maskActive = true;
        console.log('Маска для зданий создана успешно');
    } catch (error) {
        console.error('Ошибка при создании маски:', error);
    }
}

// Функция для удаления маски
function removeBuildingMask() {
    if (map.getLayer('building-mask-fill')) {
        map.removeLayer('building-mask-fill');
    }

    if (map.getSource('building-mask-source')) {
        map.removeSource('building-mask-source');
    }

    maskActive = false;
    console.log('Маска для зданий удалена');
}

// Функция для обновления видимости зданий на основе полигона
function updateBuildingsWithMask(polygonPoints) {
    if (!polygonPoints || polygonPoints.length < 3) {
        removeBuildingMask();
        return;
    }

    // Замыкаем полигон, если нужно
    let points = [...polygonPoints];
    if (JSON.stringify(points[0]) !== JSON.stringify(points[points.length - 1])) {
        points.push([...points[0]]);
    }

    // Создаем маску для скрытия зданий
    createBuildingMask(points);
}