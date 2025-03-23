from flask import Flask, render_template, request, jsonify
import json
from polygon_creator import PolygonManager, calculate_polygon_area
import os


app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')


# Создаем экземпляр менеджера полигонов
polygon_manager = PolygonManager(storage_file='polygons.json')

# Добавить новые маршруты
@app.route('/api/calculate_area', methods=['POST'])
def calculate_area():
    try:
        data = request.get_json()
        polygon_coords = data.get('polygon').get('coordinates')

        area_ha = calculate_polygon_area(polygon_coords)

        return jsonify({
            "status": "success",
            "data": {
                "area_ha": area_ha
            }
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route('/api/save_polygon', methods=['POST'])
def save_polygon():
    try:
        data = request.get_json()
        polygon_coords = data.get('polygon').get('coordinates')
        properties = data.get('polygon').get('properties', {})

        # Сохраняем полигон
        polygon_id = polygon_manager.add_polygon(polygon_coords, properties)

        # Получаем данные полигона
        polygon_data = polygon_manager.get_polygon(polygon_id)

        return jsonify({
            "status": "success",
            "data": {
                "polygon_id": polygon_id,
                "area_ha": polygon_data['area_ha']
            }
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route('/api/get_polygons', methods=['GET'])
def get_polygons():
    try:
        polygons = polygon_manager.get_all_polygons()

        return jsonify({
            "status": "success",
            "data": {
                "polygons": polygons
            }
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route('/api/reset_all', methods=['POST'])
def reset_all():
    try:
        # Сбрасываем все полигоны
        polygon_manager.clear_all()

        return jsonify({"status": "success", "message": "Все данные сброшены"})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 400



if __name__ == '__main__':
    app.run(debug=True)

