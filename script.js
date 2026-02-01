// --- 1. ДАННЫЕ И СОСТОЯНИЕ ---
let transactions = [];
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
        transactions = [];
    }
}

function saveData() {
    localStorage.setItem('kopek_transactions_v4', JSON.stringify(transactions));
}

// --- 2. ЛОГИКА КАЛЬКУЛЯТОРА ---

function calculateString(str) {
    if (!str) return 0;
    // Считаем сумму
    return str.split('+').reduce((acc, val) => {
        const num = parseInt(val.trim());
        return acc + (isNaN(num) ? 0 : num);
    }, 0);
}

// ВАЛИДАЦИЯ ВВОДА (Оставляем только цифры и знаки)
function handleCalcInput(event) {
    // Разрешенные клавиши (добавили точку и запятую)
    const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Tab', '+', '.', ','];
    const isDigit = /^[0-9]$/.test(event.key);
    
    // Если это не цифра и не разрешенная клавиша — блокируем
    if (!isDigit && !allowedKeys.includes(event.key)) {
        event.preventDefault();
    }
}

// --- 3. АВТОСОХРАНЕНИЕ И ЗАМЕНА СИМВОЛОВ ---

function handleInputAndSave(event) {
    const textarea = event.target;
    let val = textarea.value;

    // ГЛАВНОЕ ИСПРАВЛЕНИЕ:
    // Проверяем, есть ли в тексте точка, запятая или пробел
    // Если есть — заменяем их на плюс
    if (/[., ]/.test(val)) {
        // Заменяем все точки, запятые и пробелы на "+"
        // Также убираем двойные плюсы (например, если быстро нажали)
        val = val.replace(/[., ]/g, '+').replace(/\+\+/g, '+');
        
        // Обновляем значение в поле
        textarea.value = val;
    }

    // Вызываем сохранение
    autoSave();
}

function autoSave() {
    const rawCash = document.getElementById('inputCash').value;
    const rawTips = document.getElementById('inputTips').value;

    transactions = transactions.filter(t => t.date !== currentDateStr);

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

    saveData();
    renderTabs();
}

// --- 4. UI И РЕНДЕР ---
const monthTabsContainer = document.getElementById('monthTabs');
const dateHeader = document.getElementById('currentDateDisplay');

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

let activeMonthId = monthsToShow[0].id;

function init() {
    loadData();
    
    const dateStr = today.toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    dateHeader.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const todayCash = transactions.find(t => t.date === currentDateStr && t.type === 'cash');
    const todayTips = transactions.find(t => t.date === currentDateStr && t.type === 'tips');

    const inputCash = document.getElementById('inputCash');
    const inputTips = document.getElementById('inputTips');

    if (todayCash) inputCash.value = todayCash.raw;
    if (todayTips) inputTips.value = todayTips.raw;

    // --- Слушатели событий ---
    
    // 1. keydown: Только валидация (разрешить/запретить символы)
    inputCash.addEventListener('keydown', handleCalcInput);
    inputTips.addEventListener('keydown', handleCalcInput);
    
    // 2. input: Здесь происходит ЗАМЕНА точки на плюс и СОХРАНЕНИЕ
    // Событие 'input' работает на всех мобильных устройствах надежно
    inputCash.addEventListener('input', handleInputAndSave);
    inputTips.addEventListener('input', handleInputAndSave);

    renderTabs();
}

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
            renderTabs();
        };
        
        monthTabsContainer.appendChild(div);
    });
}

init();