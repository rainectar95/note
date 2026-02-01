// --- 1. ДАННЫЕ И СОСТОЯНИЕ ---
let transactions = [];
// Мы работаем всегда с "Сегодня" в этом интерфейсе
const today = new Date();

function getLocalISODate(date) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

const currentDateStr = getLocalISODate(today);

function loadData() {
    const saved = localStorage.getItem('kopek_transactions_v4');
    if (saved) {
        transactions = JSON.parse(saved);
    } else {
        // Пустой старт
        transactions = [];
    }
}

function saveData() {
    localStorage.setItem('kopek_transactions_v4', JSON.stringify(transactions));
}

// --- 2. ЛОГИКА КАЛЬКУЛЯТОРА ---

function calculateString(str) {
    if (!str) return 0;
    return str.split('+').reduce((acc, val) => {
        const num = parseInt(val.trim());
        return acc + (isNaN(num) ? 0 : num);
    }, 0);
}

// Обработчик "Пробел = Плюс"
function handleCalcInput(event) {
    const textarea = event.target;
    
    // Если нажат пробел -> заменяем на +
    if (event.key === '.') {
        event.preventDefault();
        const val = textarea.value;
        if (val.length > 0 && val.slice(-1) !== '+') {
            textarea.value += '+';
            // Вызываем автосохранение вручную, так как value изменили программно
            autoSave(); 
        }
    }
    
    // Валидация символов
    const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Tab', '+'];
    const isDigit = /^[0-9]$/.test(event.key);
    
    if (!isDigit && !allowedKeys.includes(event.key)) {
        event.preventDefault();
    }
}

// --- 3. АВТОСОХРАНЕНИЕ ---

function autoSave() {
    const rawCash = document.getElementById('inputCash').value;
    const rawTips = document.getElementById('inputTips').value;

    // 1. Удаляем старые записи ЗА СЕГОДНЯ
    transactions = transactions.filter(t => t.date !== currentDateStr);

    // 2. Создаем новые записи, если поля не пустые
    if (rawCash) {
        transactions.push({
            date: currentDateStr,
            type: 'cash',
            amount: calculateString(rawCash),
            raw: rawCash
        });
    }

    if (rawTips) {
        transactions.push({
            date: currentDateStr,
            type: 'tips',
            amount: calculateString(rawTips),
            raw: rawTips
        });
    }

    // 3. Сохраняем в память
    saveData();

    // 4. Обновляем цифры в шапке (Месяцы)
    renderTabs();
}

// --- 4. UI И РЕНДЕР ---
const monthTabsContainer = document.getElementById('monthTabs');
const dateHeader = document.getElementById('currentDateDisplay');

// Настройка месяцев
const monthsToShow = [0, 1, 2].map(offset => {
    const d = new Date();
    d.setMonth(d.getMonth() - offset);
    return {
        id: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString('ru-RU', { month: 'long' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth()
    };
});

// Активный месяц (по умолчанию текущий)
let activeMonthId = monthsToShow[0].id;

function init() {
    loadData();
    
    // Устанавливаем дату в заголовок
    const dateStr = today.toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    dateHeader.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    // Загружаем данные в поля ввода (если они уже были сохранены сегодня)
    const todayCash = transactions.find(t => t.date === currentDateStr && t.type === 'cash');
    const todayTips = transactions.find(t => t.date === currentDateStr && t.type === 'tips');

    const inputCash = document.getElementById('inputCash');
    const inputTips = document.getElementById('inputTips');

    if (todayCash) inputCash.value = todayCash.raw;
    if (todayTips) inputTips.value = todayTips.raw;

    // Навешиваем слушатели событий
    inputCash.addEventListener('keydown', handleCalcInput);
    inputTips.addEventListener('keydown', handleCalcInput);
    
    // Событие 'input' срабатывает при любом изменении текста (печать, удаление, вставка)
    inputCash.addEventListener('input', autoSave);
    inputTips.addEventListener('input', autoSave);

    renderTabs();
}

// Статистика для шапки
function getMonthStats(monthId) {
    let cash = 0, tips = 0;
    transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (`${d.getFullYear()}-${d.getMonth()}` === monthId) {
            if (tx.type === 'cash') cash += tx.amount; else tips += tx.amount;
        }
    });
    return { cash, tips, total: cash + tips };
}

function formatMoney(num) { return num.toLocaleString('ru-RU') + ' ₽'; }
function formatMoneyShort(num) { return num.toLocaleString('ru-RU'); }

function renderTabs() {
    monthTabsContainer.innerHTML = '';
    monthsToShow.forEach(m => {
        const stats = getMonthStats(m.id);
        const div = document.createElement('div');
        div.className = `month-card ${m.id === activeMonthId ? 'active' : ''}`;
        
        div.innerHTML = `
            <div class="m-name">${m.label}</div>
            <div class="m-total">${formatMoney(stats.total)}</div>
            <div class="m-pills">
                <div class="pill cash">${formatMoneyShort(stats.cash)}</div>
                <div class="pill tips">${formatMoneyShort(stats.tips)}</div>
            </div>
        `;
        
        div.onclick = () => {
            activeMonthId = m.id;
            renderTabs(); // Просто обновляем выделение, данные в инпутах всегда за "СЕГОДНЯ"
        };
        
        monthTabsContainer.appendChild(div);
    });
}

init();