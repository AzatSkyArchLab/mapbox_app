/**
 * Модуль для создания и редактирования полигонов
 */

// Состояние полигона
const polygonState = {
    drawingMode: false,      // Режим рисования активен?
    editMode: false,         // Режим редактирования активен?
    points: [],              // Точки полигона (вершины)
    currentPolygon: null,    // Ссылка на текущий полигон
    isDragging: false,       // Режим перетаскивания точки
    dragPointIndex: -1       // Индекс перетаскиваемой точки
};

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    initPolygonCreator();
});

/**
 * Инициализация модуля создания полигонов
 */
function initPolygonCreator() {
    console.log('Инициализация модуля создания полигонов...');

    // Настройка элементов интерфейса
    setupUIElements();

    // Настройка обработчиков событий
    setupEventListeners();
}

/**
 * Настройка и проверка элементов интерфейса
 */
function setupUIElements() {
    // Проверка наличия необходимых элементов интерфейса
    const requiredElements = [
        'draw-polygon-btn',
        'finish-polygon-btn',
        'edit-polygon-btn',
        'finish-edit-btn',
        'reset-all-btn',
        'polygon-info',
        'polygon-data',
        'polygon-area'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.warn('Отсутствуют элементы UI:', missingElements.join(', '));
    } else {
        console.log('Все необходимые элементы UI найдены');
    }
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
    // Получаем элементы управления
    const drawPolygonBtn = document.getElementById('draw-polygon-btn');
    const finishPolygonBtn = document.getElementById('finish-polygon-btn');
    const editPolygonBtn = document.getElementById('edit-polygon-btn');
    const finishEditBtn = document.getElementById('finish-edit-btn');
    const resetAllBtn = document.getElementById('reset-all-btn');

    // Добавляем обработчики событий для кнопок
    if (drawPolygonBtn) {
        drawPolygonBtn.addEventListener('click', togglePolygonDrawingMode);
    }

    if (finishPolygonBtn) {
        finishPolygonBtn.addEventListener('click', finishPolygon);
    }

    if (editPolygonBtn) {
        editPolygonBtn.addEventListener('click', togglePolygonEditMode);
    }

    if (finishEditBtn) {
        finishEditBtn.addEventListener('click', finishEditMode);
    }

    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', resetAll);
    }

    // Настройка обработчика клика по карте для добавления точек полигона
    setupMapClickHandler();

    console.log('Обработчики событий настроены');
}

/**
 * Настройка обработчика клика по карте
 */
function setupMapClickHandler() {
    if (typeof map === 'undefined') {
        console.error('Карта не инициализирована');
        return;
    }

    map.on('click', function(e) {
        // Проверяем, активен ли режим рисования
        if (!polygonState.drawingMode) return;

        // Получаем координаты клика
        const coords = [e.lngLat.lng, e.lngLat.lat];

        // Добавляем точку в массив
        polygonState.points.push(coords);

        // Обновляем отображение полигона на карте
        updatePolygonDisplay();

        // Обновляем информацию о полигоне
        updatePolygonInfo();

        // Поддерживаем курсор перекрестия
        setMapCursor('crosshair');

        console.log('Добавлена точка:', coords);
    });
}

/**
 * ======= УПРАВЛЕНИЕ РЕЖИМАМИ =======
 */

/**
 * Переключение режима рисования полигона
 */
function togglePolygonDrawingMode() {
    const drawPolygonBtn = document.getElementById('draw-polygon-btn');
    const finishPolygonBtn = document.getElementById('finish-polygon-btn');
    const editPolygonBtn = document.getElementById('edit-polygon-btn');
    const finishEditBtn = document.getElementById('finish-edit-btn');

    // Выключаем режим редактирования, если он активен
    if (polygonState.editMode) {
        polygonState.editMode = false;
        if (editPolygonBtn) editPolygonBtn.classList.remove('active');
        if (finishEditBtn) finishEditBtn.style.display = 'none';
    }

    // Переключаем режим рисования
    polygonState.drawingMode = !polygonState.drawingMode;

    if (polygonState.drawingMode) {
        // Включаем режим рисования
        console.log('Включен режим рисования полигона');

        drawPolygonBtn.classList.add('active');
        finishPolygonBtn.style.display = 'block';

        // Скрываем кнопки редактирования
        if (editPolygonBtn) editPolygonBtn.style.display = 'none';
        if (finishEditBtn) finishEditBtn.style.display = 'none';

        // Сбрасываем предыдущий полигон
        polygonState.points = [];
        polygonState.currentPolygon = null;

        // Обновляем инструкцию
        updateInstructionText('Кликайте по карте, чтобы добавить точки полигона.');

        // Скрываем данные о полигоне
        const polygonData = document.getElementById('polygon-data');
        if (polygonData) polygonData.style.display = 'none';

        // Показываем все здания перед рисованием нового полигона
        if (typeof showAllBuildings === 'function') {
            showAllBuildings();
        }

        // Меняем курсор на перекрестие
        setMapCursor('crosshair');
    } else {
        // Выключаем режим рисования
        console.log('Выключен режим рисования полигона');

        drawPolygonBtn.classList.remove('active');
        finishPolygonBtn.style.display = 'none';

        // Возвращаем обычный курсор
        setMapCursor('');
    }

    // Обновляем отображение
    updatePolygonDisplay();
}

/**
 * Переключение режима редактирования полигона
 */
function togglePolygonEditMode() {
    const editPolygonBtn = document.getElementById('edit-polygon-btn');
    const finishEditBtn = document.getElementById('finish-edit-btn');

    // Если нет полигона, нельзя включить режим редактирования
    if (polygonState.points.length < 3) {
        alert('Сначала создайте полигон!');
        return;
    }

    // Выключаем режим рисования, если он активен
    if (polygonState.drawingMode) {
        togglePolygonDrawingMode();
    }

    // Переключаем режим редактирования
    polygonState.editMode = !polygonState.editMode;

    if (polygonState.editMode) {
        // Включаем режим редактирования
        console.log('Включен режим редактирования полигона');

        editPolygonBtn.classList.add('active');
        if (finishEditBtn) finishEditBtn.style.display = 'block';

        // Обновляем инструкцию
        updateInstructionText('Перетащите вершины, чтобы изменить форму полигона.');

        // Показываем все здания на время редактирования
        if (typeof showAllBuildings === 'function') {
            showAllBuildings();
        }
    } else {
        // Выключаем режим редактирования
        console.log('Выключен режим редактирования полигона');

        editPolygonBtn.classList.remove('active');
        if (finishEditBtn) finishEditBtn.style.display = 'none';

        // Обновляем инструкцию
        updateInstructionText('Полигон создан.');

        // Скрываем здания внутри полигона
        updateBuildingsVisibility();
    }
}

/**
 * Завершение редактирования полигона
 */
function finishEditMode() {
    const editPolygonBtn = document.getElementById('edit-polygon-btn');
    const finishEditBtn = document.getElementById('finish-edit-btn');

    // Выключаем режим редактирования
    polygonState.editMode = false;
    polygonState.isDragging = false;

    // Обновляем UI
    if (editPolygonBtn) editPolygonBtn.classList.remove('active');
    if (finishEditBtn) finishEditBtn.style.display = 'none';

    // Обновляем инструкцию
    updateInstructionText('Полигон отредактирован.');

    // Обновляем информацию о полигоне
    updatePolygonInfo();

    // Скрываем здания внутри полигона
    updateBuildingsVisibility();

    // Сохраняем полигон
    savePolygon();

    console.log('Завершено редактирование полигона');
}

/**
 * Завершение рисования полигона
 */
function finishPolygon() {
    const drawPolygonBtn = document.getElementById('draw-polygon-btn');
    const finishPolygonBtn = document.getElementById('finish-polygon-btn');
    const editPolygonBtn = document.getElementById('edit-polygon-btn');

    // Проверяем, достаточно ли точек для полигона
    if (polygonState.points.length < 3) {
        alert('Полигон должен иметь минимум 3 точки!');
        return;
    }

    // Выключаем режим рисования
    polygonState.drawingMode = false;

    // Обновляем UI
    drawPolygonBtn.classList.remove('active');
    finishPolygonBtn.style.display = 'none';
    if (editPolygonBtn) editPolygonBtn.style.display = 'block';

    // Возвращаем обычный курсор
    setMapCursor('');

    // Обновляем инструкцию
    updateInstructionText('Полигон создан. Нажмите "Редактировать полигон" для изменения формы.');

    // Скрываем здания внутри полигона
    updateBuildingsVisibility();

    // Сохраняем полигон
    savePolygon();

    console.log('Завершено рисование полигона с', polygonState.points.length, 'точками');
}

/**
 * ======= УПРАВЛЕНИЕ ОТОБРАЖЕНИЕМ =======
 */

/**
 * Обновление отображения полигона на карте
 */
function updatePolygonDisplay() {
    // Готовим массив объектов для отображения
    const features = [];

    // Если есть минимум 3 точки, создаем полигон
    if (polygonState.points.length >= 3) {
        // Копируем массив точек
        const polygonCoords = [...polygonState.points];

        // Замыкаем полигон (добавляем первую точку в конец)
        if (!arePointsEqual(polygonCoords[0], polygonCoords[polygonCoords.length - 1])) {
            polygonCoords.push([...polygonCoords[0]]);
        }

        // Создаем полигон
        const polygonFeature = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [polygonCoords]
            },
            properties: {
                type: 'polygon'
            }
        };

        features.push(polygonFeature);
        polygonState.currentPolygon = polygonFeature;
    }

    // Добавляем точки полигона
    polygonState.points.forEach((point, index) => {
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: point
            },
            properties: {
                pointType: 'polygon-vertex',
                index: index
            }
        });
    });

    // Обновляем источник данных
    if (typeof updateGeoJSONSource === 'function') {
        updateGeoJSONSource(features);
    } else {
        console.error('Функция updateGeoJSONSource не найдена');
    }
}

/**
 * Обновление информации о полигоне (площадь и т.д.)
 */
function updatePolygonInfo() {
    const polygonData = document.getElementById('polygon-data');
    const polygonArea = document.getElementById('polygon-area');

    if (!polygonData || !polygonArea) return;

    if (polygonState.points.length < 3) {
        polygonData.style.display = 'none';
        return;
    }

    console.log('Обновление информации о полигоне...');

    // Выполняем запрос к серверу для расчета площади
    fetch('/api/calculate_area', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            polygon: {
                coordinates: polygonState.points
            }
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка сервера: ' + response.status);
        }
        return response.json();
    })
    .then(result => {
        const areaHa = result.data.area_ha;

        // Обновляем отображение площади
        polygonArea.textContent = areaHa;
        polygonData.style.display = 'block';
        console.log('Площадь полигона:', areaHa, 'га');

        // Обновляем статистику застройки с использованием функции из density_calculator.js
        if (typeof updateBuildingStats === 'function') {
            updateBuildingStats(areaHa);
        } else {
            console.error('Функция updateBuildingStats не найдена');
        }
    })
    .catch(error => {
        console.error('Ошибка при расчете площади:', error);
    });
}

/**
 * Обновление видимости зданий в соответствии с полигоном
 */
function updateBuildingsVisibility() {
    if (polygonState.points.length < 3) return;

    // Создаем копию точек для полигона
    const polygonCoords = [...polygonState.points];

    // Замыкаем полигон для корректной работы
    if (!arePointsEqual(polygonCoords[0], polygonCoords[polygonCoords.length - 1])) {
        polygonCoords.push([...polygonCoords[0]]);
    }

    console.log('Обновление видимости зданий для полигона с', polygonCoords.length, 'точками');

    // Используем функцию из map.js для скрытия зданий внутри полигона
    if (typeof hideBuildingsInPolygon === 'function') {
        // Передаем координаты полигона для скрытия только тех зданий, которые находятся внутри
        hideBuildingsInPolygon(polygonCoords);
    } else {
        console.error('Функция hideBuildingsInPolygon не найдена');
    }
}

/**
 * ======= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =======
 */

/**
 * Проверка равенства двух точек
 * @param {Array} point1 - Первая точка [lng, lat]
 * @param {Array} point2 - Вторая точка [lng, lat]
 * @returns {boolean} - true, если точки равны
 */
function arePointsEqual(point1, point2) {
    if (!point1 || !point2) return false;
    return point1[0] === point2[0] && point1[1] === point2[1];
}

/**
 * Обновление текста инструкции
 * @param {string} text - Текст инструкции
 */
function updateInstructionText(text) {
    const infoPanel = document.getElementById('polygon-info');
    if (infoPanel) {
        const instructionP = infoPanel.querySelector('p');
        if (instructionP) {
            instructionP.textContent = text;
        }
    }
}

/**
 * Сохранение полигона на сервере
 */
function savePolygon() {
    console.log('Сохранение полигона на сервере...');

    fetch('/api/save_polygon', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            polygon: {
                coordinates: polygonState.points,
                properties: {
                    createdAt: new Date().toISOString()
                }
            }
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка сервера: ' + response.status);
        }
        return response.json();
    })
    .then(result => {
        console.log('Полигон успешно сохранен:', result);
    })
    .catch(error => {
        console.error('Ошибка при сохранении полигона:', error);
    });
}

/**
 * Сброс всего состояния
 */
function resetAll() {
    console.log('Сброс всех данных...');

    // Сбрасываем состояние полигона
    polygonState.drawingMode = false;
    polygonState.editMode = false;
    polygonState.isDragging = false;
    polygonState.points = [];
    polygonState.currentPolygon = null;
    polygonState.dragPointIndex = -1;

    // Сбрасываем UI
    const buttons = {
        'draw-polygon-btn': { active: false, display: 'block' },
        'finish-polygon-btn': { active: false, display: 'none' },
        'edit-polygon-btn': { active: false, display: 'none' },
        'finish-edit-btn': { active: false, display: 'none' }
    };

    Object.entries(buttons).forEach(([id, state]) => {
        const button = document.getElementById(id);
        if (button) {
            if (state.active === false) button.classList.remove('active');
            button.style.display = state.display;
        }
    });

    // Скрываем информационные панели
    const polygonData = document.getElementById('polygon-data');
    if (polygonData) polygonData.style.display = 'none';

    // Обновляем инструкцию
    updateInstructionText('Кликайте по карте, чтобы добавить точки полигона.');

    // Возвращаем обычный курсор
    if (typeof setMapCursor === 'function') {
        setMapCursor('');
    }

    // Показываем все 3D здания
    if (typeof showAllBuildings === 'function') {
        showAllBuildings();
    }

    // Очищаем карту
    if (typeof clearMapFeatures === 'function') {
        clearMapFeatures();
    }

    // Отправляем запрос на сброс данных на сервере
    fetch('/api/reset_all', {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка сервера: ' + response.status);
        }
        return response.json();
    })
    .then(result => {
        console.log('Данные успешно сброшены:', result);
    })
    .catch(error => {
        console.error('Ошибка при сбросе данных:', error);
    });
}