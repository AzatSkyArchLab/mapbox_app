/**
 * Модуль для расчета параметров застройки
 */

/**
 * Расчет подходящего значения плотности для заданного размера территории
 * с использованием интерполяции между значениями из зеленых ячеек таблицы.
 * 
 * @param {number} territory_size - Размер территории в гектарах (га)
 * @returns {number} - Подходящее значение плотности в тыс.кв.м/га
 */
function getDensityValue(territory_size) {
    // Определяем зеленые ячейки из таблицы как пары (размер_территории, значение_плотности)
    const greenCells = [
        [1, 20], [1, 22], [1, 25], [1, 30], [1, 35],  // строка для 1 га
        [5, 20], [5, 22], [5, 25],                    // строка для 5 га
        [15, 20], [15, 22],                           // строка для 15 га
        [30, 20],                                      // строка для 30 га
        [60, 20]                                       // строка для 60 га
    ];
    
    // Получаем уникальные размеры территорий
    const uniqueTerritorySizes = [...new Set(greenCells.map(cell => cell[0]))].sort((a, b) => a - b);
    
    // Если указан точный размер из таблицы, берем максимальное значение плотности
    if (uniqueTerritorySizes.includes(territory_size)) {
        const matchingCells = greenCells.filter(cell => cell[0] === territory_size);
        const maxDensity = Math.max(...matchingCells.map(cell => cell[1]));
        return maxDensity;
    }
    
    // Для промежуточных значений находим ближайшие размеры территорий для интерполяции
    const lowerSizes = uniqueTerritorySizes.filter(size => size < territory_size);
    const upperSizes = uniqueTerritorySizes.filter(size => size > territory_size);
    
    const lowerSize = lowerSizes.length > 0 ? Math.max(...lowerSizes) : Math.min(...uniqueTerritorySizes);
    const upperSize = upperSizes.length > 0 ? Math.min(...upperSizes) : Math.max(...uniqueTerritorySizes);
    
    // Находим максимальные плотности для этих размеров территорий
    const lowerDensityCells = greenCells.filter(cell => cell[0] === lowerSize);
    const upperDensityCells = greenCells.filter(cell => cell[0] === upperSize);
    
    const lowerDensity = Math.max(...lowerDensityCells.map(cell => cell[1]));
    const upperDensity = Math.max(...upperDensityCells.map(cell => cell[1]));
    
    // Выполняем линейную интерполяцию
    // Формула: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
    let interpolatedDensity = lowerDensity + (territory_size - lowerSize) * (upperDensity - lowerDensity) / (upperSize - lowerSize);
    
    // Округляем до ближайшего 0.1
    interpolatedDensity = Math.round(interpolatedDensity * 10) / 10;
    
    return interpolatedDensity;
}

/**
 * Расчет суммарной поэтажной площади (СПП)
 * 
 * @param {number} density - Плотность застройки в тыс.кв.м/га
 * @param {number} area - Площадь полигона в гектарах
 * @returns {number} - Суммарная поэтажная площадь в тыс.кв.м
 */
function calculateTotalFloorArea(density, area) {
    return density * area;
}

/**
 * Обновление статистики застройки
 * 
 * @param {number} area - Площадь полигона в гектарах
 */
function updateBuildingStats(area) {
    // Рассчитываем плотность
    const density = getDensityValue(area);
    
    // Рассчитываем СПП
    const totalFloorArea = calculateTotalFloorArea(density, area);
    
    // Обновляем элементы отображения
    updateStatDisplay(area, density, totalFloorArea);
    
    console.log(`Площадь: ${area} га, Плотность: ${density} тыс.кв.м/га, СПП: ${totalFloorArea.toFixed(1)} тыс.кв.м`);
}

/**
 * Обновление элементов отображения статистики
 * 
 * @param {number} area - Площадь полигона в гектарах
 * @param {number} density - Плотность застройки в тыс.кв.м/га
 * @param {number} totalFloorArea - Суммарная поэтажная площадь в тыс.кв.м
 */
function updateStatDisplay(area, density, totalFloorArea) {
    const densityDisplay = document.getElementById('density-value-display');
    const tfsDisplay = document.getElementById('total-floor-area-display');
    
    if (densityDisplay) {
        densityDisplay.textContent = `${density.toFixed(1)} тыс.кв.м/га`;
    }
    
    if (tfsDisplay) {
        tfsDisplay.textContent = `${totalFloorArea.toFixed(1)} тыс.кв.м`;
    }
    
    // Показываем панель статистики
    const statsPanel = document.getElementById('stats-panel');
    if (statsPanel) {
        statsPanel.style.display = 'block';
    }
}

// Экспортируем функции для использования в других модулях
window.getDensityValue = getDensityValue;
window.calculateTotalFloorArea = calculateTotalFloorArea;
window.updateBuildingStats = updateBuildingStats;