/**
 * Модуль управления картой Mapbox и слоями зданий
 */

// Константы и глобальные переменные
const MAPBOX_TOKEN = '';
const DEFAULT_CENTER = [37.618423, 55.751244]; // Москва
const DEFAULT_ZOOM = 12;
const DEFAULT_PITCH = 45;
const DEFAULT_BEARING = 0;

// Глобальные переменные
let map;
let buildingsVisible = true;
let defaultBuildingFilter = ['==', 'extrude', 'true']; // Стандартный фильтр зданий

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    initMap();
});

/**
 * Инициализация и настройка карты
 */
function initMap() {
    console.log('Инициализация карты...');

    // Настройка токена доступа
    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Создание экземпляра карты
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        antialias: true
    });

    // Добавление элементов управления
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.FullscreenControl());
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }));

    // Инициализация слоев при загрузке карты
    map.on('load', function() {
        console.log('Карта загружена, инициализация слоев...');

        // Инициализация источников данных
        initDataSources();

        // Добавление базовых слоев
        addBaseLayers();

        // Настройка обработчиков событий
        setupEventHandlers();
    });
}

/**
 * Инициализация источников данных
 */
function initDataSources() {
    // Создание источника данных для пользовательских объектов
    if (!map.getSource('user-features')) {
        map.addSource('user-features', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
        console.log('Источник данных user-features создан');
    }
}

/**
 * Добавление базовых слоев
 */
function addBaseLayers() {
    // Добавление слоев для полигонов
    addPolygonLayers();

    // Добавление 3D зданий
    add3DBuildings();
}

/**
 * Добавление слоев для полигонов
 */
function addPolygonLayers() {
    // Слой для заливки полигонов
    if (!map.getLayer('polygon-fill')) {
        map.addLayer({
            id: 'polygon-fill',
            type: 'fill',
            source: 'user-features',
            filter: ['==', '$type', 'Polygon'],
            paint: {
                'fill-color': '#3bb2d0',
                'fill-opacity': 0.4
            }
        });
    }

    // Слой для границ полигонов
    if (!map.getLayer('polygon-outline')) {
        map.addLayer({
            id: 'polygon-outline',
            type: 'line',
            source: 'user-features',
            filter: ['==', '$type', 'Polygon'],
            paint: {
                'line-color': '#3bb2d0',
                'line-width': 2
            }
        });
    }

    // Слой для вершин полигонов
    if (!map.getLayer('polygon-points')) {
        map.addLayer({
            id: 'polygon-points',
            type: 'circle',
            source: 'user-features',
            filter: ['==', '$type', 'Point'],
            paint: {
                'circle-radius': 6,
                'circle-color': '#ff4d4f',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });
    }

    console.log('Слои полигонов добавлены');
}

/**
 * Добавление слоя 3D зданий
 */
function add3DBuildings() {
    if (map.getLayer('3d-buildings')) {
        console.log('Слой 3d-buildings уже существует');
        return;
    }

    // Находим слой, после которого добавить 3D здания
    const layers = map.getStyle().layers;
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    // Добавляем слой 3D зданий
    map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': defaultBuildingFilter,
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                15, 0,
                15.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
        }
    }, labelLayerId);

    console.log('Слой 3D зданий добавлен');
}

/**
 * Настройка обработчиков событий
 */
function setupEventHandlers() {
    // Настройка обработчиков для редактирования полигонов
    setupPolygonEditHandlers();

    // Настройка обработчиков для управления зданиями
    setupBuildingsControl();
}

/**
 * Настройка обработчиков событий для редактирования полигонов
 */
function setupPolygonEditHandlers() {
    // Обработчик нажатия на вершину полигона
    map.on('mousedown', 'polygon-points', function(e) {
        if (typeof polygonState === 'undefined' || !polygonState.editMode) return;

        // Отменяем стандартное поведение
        e.preventDefault();

        // Получаем индекс точки
        const pointIndex = e.features[0].properties.index;

        // Меняем курсор
        map.getCanvas().style.cursor = 'grabbing';

        // Активируем режим перетаскивания
        polygonState.isDragging = true;
        polygonState.dragPointIndex = pointIndex;

        // Добавляем временные обработчики
        map.on('mousemove', onDragMove);
        map.once('mouseup', onDragEnd);
    });

    // Подсветка при наведении на точки
    map.on('mouseenter', 'polygon-points', function(e) {
        if (typeof polygonState === 'undefined' || !polygonState.editMode) return;

        map.getCanvas().style.cursor = 'grab';
    });

    map.on('mouseleave', 'polygon-points', function() {
        if (typeof polygonState === 'undefined' || !polygonState.editMode) return;

        if (!polygonState.isDragging) {
            map.getCanvas().style.cursor = '';
        }
    });

    console.log('Обработчики редактирования полигона настроены');
}

/**
 * Настройка элементов управления зданиями
 */
function setupBuildingsControl() {
    const buildingsToggle = document.getElementById('buildings-toggle');
    const buildingsOpacity = document.getElementById('buildings-opacity');
    const opacityValue = document.getElementById('opacity-value');

    // Обработчик нажатия на кнопку видимости зданий
    if (buildingsToggle) {
        buildingsToggle.addEventListener('click', function() {
            toggleBuildingsVisibility();

            // Обновляем текст и стиль кнопки
            if (buildingsVisible) {
                buildingsToggle.textContent = 'Скрыть здания';
                buildingsToggle.classList.remove('active');
            } else {
                buildingsToggle.textContent = 'Показать здания';
                buildingsToggle.classList.add('active');
            }
        });
    }

    // Обработчик изменения слайдера прозрачности
    if (buildingsOpacity) {
        buildingsOpacity.addEventListener('input', function() {
            const opacity = parseInt(this.value) / 100;
            setBuildingsOpacity(opacity);

            // Обновляем отображаемое значение
            if (opacityValue) {
                opacityValue.textContent = this.value + '%';
            }
        });
    }

    console.log('Элементы управления зданиями настроены');
}

/**
 * Обработчик движения мыши при перетаскивании вершины
 */
function onDragMove(e) {
    if (typeof polygonState === 'undefined' || !polygonState.isDragging) return;

    // Получаем новые координаты
    const coords = [e.lngLat.lng, e.lngLat.lat];

    // Обновляем координаты точки
    polygonState.points[polygonState.dragPointIndex] = coords;

    // Обновляем отображение
    updatePolygonDisplay();
}

/**
 * Обработчик окончания перетаскивания вершины
 */
function onDragEnd(e) {
    if (typeof polygonState === 'undefined') return;

    // Отключаем режим перетаскивания
    polygonState.isDragging = false;
    polygonState.dragPointIndex = -1;

    // Удаляем обработчик движения мыши
    map.off('mousemove', onDragMove);

    // Возвращаем обычный курсор
    map.getCanvas().style.cursor = '';

    // Обновляем информацию о полигоне
    updatePolygonInfo();

    // Сохраняем полигон
    savePolygon();
}

/**
 * ======= ФУНКЦИИ УПРАВЛЕНИЯ ЗДАНИЯМИ =======
 */

/**
 * Переключение видимости 3D зданий
 */
function toggleBuildingsVisibility() {
    if (!map.getLayer('3d-buildings')) {
        console.error('Слой 3d-buildings не найден');
        return;
    }

    try {
        const currentVisibility = map.getLayoutProperty('3d-buildings', 'visibility');

        if (currentVisibility === 'visible' || currentVisibility === undefined) {
            // Скрываем здания
            map.setLayoutProperty('3d-buildings', 'visibility', 'none');
            buildingsVisible = false;
            console.log('Здания скрыты');
        } else {
            // Показываем здания
            map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
            buildingsVisible = true;
            console.log('Здания отображены');
        }
    } catch (error) {
        console.error('Ошибка при переключении видимости зданий:', error);
    }
}

/**
 * Установка прозрачности 3D зданий
 * @param {number} opacity - Значение прозрачности от 0 до 1
 */
function setBuildingsOpacity(opacity) {
    if (!map.getLayer('3d-buildings')) {
        console.error('Слой 3d-buildings не найден');
        return;
    }

    try {
        // Устанавливаем прозрачность зданий
        map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', opacity);
        console.log('Прозрачность зданий установлена в', opacity);
    } catch (error) {
        console.error('Ошибка при установке прозрачности зданий:', error);
    }
}

/**
 * Скрытие зданий внутри полигона (для обратной совместимости)
 * @param {Array} polygonCoords - Координаты полигона
 */
function hideBuildingsInPolygon(polygonCoords) {
    // Эта функция больше не используется для селективного скрытия зданий
    // Оставлена для обратной совместимости
    console.log('Функция hideBuildingsInPolygon вызвана, но не выполняет селективное скрытие');

    // Используем глобальную настройку видимости зданий
    if (buildingsVisible) {
        // Не делаем ничего, так как здания видны
        console.log('Здания уже видны, действие не требуется');
    }
}

/**
 * Восстановление всех зданий (для обратной совместимости)
 */
function showAllBuildings() {
    if (!map.getLayer('3d-buildings')) {
        console.error('Слой 3d-buildings не найден');
        return;
    }

    try {
        // Восстанавливаем видимость зданий
        map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
        buildingsVisible = true;
        console.log('Все здания отображены');
    } catch (error) {
        console.error('Ошибка при отображении зданий:', error);
    }
}

/**
 * ======= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =======
 */

/**
 * Обновление GeoJSON источника данных
 */
function updateGeoJSONSource(features) {
    if (!map.getSource('user-features')) {
        console.error('Источник данных user-features не найден');
        return;
    }

    map.getSource('user-features').setData({
        type: 'FeatureCollection',
        features: features
    });
}

/**
 * Получение текущего GeoJSON из источника
 */
function getCurrentGeoJSON() {
    if (!map.getSource('user-features')) {
        return {
            type: 'FeatureCollection',
            features: []
        };
    }

    return map.getSource('user-features')._data;
}

/**
 * Удаление всех пользовательских объектов с карты
 */
function clearMapFeatures() {
    updateGeoJSONSource([]);
}

/**
 * Изменение курсора карты
 */
function setMapCursor(cursorType) {
    if (map) {
        map.getCanvas().style.cursor = cursorType;
    }
}

// Экспортируем функции для использования в других скриптах
window.updateGeoJSONSource = updateGeoJSONSource;
window.getCurrentGeoJSON = getCurrentGeoJSON;
window.clearMapFeatures = clearMapFeatures;
window.setMapCursor = setMapCursor;
window.hideBuildingsInPolygon = hideBuildingsInPolygon;
window.showAllBuildings = showAllBuildings;
