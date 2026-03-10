// --- 1. ДАННЫЕ И СОСТОЯНИЕ ---
let transactions = [];
const today = new Date();

// Вспомогательная функция для корректной даты
function getLocalISODate(date) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

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
    // Безопасно превращаем в строку перед split
    if (!str) return 0;
    return String(str).split('+').reduce((acc, val) => {
        const num = parseInt(val.trim());
        return acc + (isNaN(num) ? 0 : num);
    }, 0);
}

function handleCalcInput(event) {
    const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Tab', '+', '.', ','];
    const isDigit = /^[0-9]$/.test(event.key);
    if (!isDigit && !allowedKeys.includes(event.key)) {
        event.preventDefault();
    }
}

// --- 3. СОХРАНЕНИЕ ---

function handleInputAndSave(event) {
    const textarea = event.target;
    let val = textarea.value;

    if (/[., ]/.test(val)) {
        val = val.replace(/[., ]/g, '+').replace(/\+\+/g, '+');
        textarea.value = val;
    }

    autoSave();
}

function autoSave() {
    const rawCash = document.getElementById('inputCash').value;
    const rawTips = document.getElementById('inputTips').value;

    // Очищаем транзакции активного месяца перед перезаписью
    transactions = transactions.filter(t => {
        const d = new Date(t.date);
        const tMonthId = `${d.getFullYear()}-${d.getMonth()}`;
        return tMonthId !== activeMonthId;
    });

    // Формируем дату для сохранения (1-е число активного месяца)
    const [year, monthIndex] = activeMonthId.split('-');
    const saveDate = new Date(year, monthIndex, 1, 12); 
    const saveDateStr = getLocalISODate(saveDate);

    const parseAndPush = (rawString, type) => {
        if (!rawString) return;
        const parts = String(rawString).split('+');
        parts.forEach(part => {
            const num = parseInt(part.trim());
            if (!isNaN(num) && num !== 0) {
                transactions.push({
                    date: saveDateStr,
                    type: type,
                    amount: num
                });
            }
        });
    };

    parseAndPush(rawCash, 'cash');
    parseAndPush(rawTips, 'tips');

    saveData();
    renderTabsHeaderOnly();
}

// --- 4. ДИНАМИЧЕСКИЕ МЕСЯЦЫ ---

const monthTabsContainer = document.getElementById('monthTabs');
const dateHeader = document.getElementById('currentDateDisplay');

// Эта переменная теперь будет заполняться динамически
let monthsToShow = [];
let activeMonthId = null;

// Функция генерирует список месяцев: от СЕГОДНЯ назад до САМОЙ СТАРОЙ ЗАПИСИ
function generateMonthTabs() {
    const now = new Date();
    
    // 1. Находим дату самой старой транзакции
    let minDate = new Date();
    // Отматываем минимум на 2 месяца назад по умолчанию (чтобы всегда было хотя бы 3 вкладки)
    minDate.setMonth(minDate.getMonth() - 2); 
    
    if (transactions.length > 0) {
        // Ищем самую раннюю дату в истории
        const dates = transactions.map(t => new Date(t.date));
        const earliestTx = new Date(Math.min.apply(null, dates));
        
        // Если история уходит глубже, чем 2 месяца, берем её
        if (earliestTx < minDate) {
            minDate = earliestTx;
        }
    }

    // 2. Генерируем массив месяцев от "Сейчас" до "minDate"
    monthsToShow = [];
    let iterator = new Date(now.getFullYear(), now.getMonth(), 1); // Первое число текущего месяца
    const endDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

    // Цикл пока итератор не уйдет в прошлое дальше минимальной даты
    while (iterator >= endDate) {
        monthsToShow.push({
            id: `${iterator.getFullYear()}-${iterator.getMonth()}`,
            label: iterator.toLocaleString('ru-RU', { month: 'long' }),
            year: iterator.getFullYear()
        });
        // Шаг назад на 1 месяц
        iterator.setMonth(iterator.getMonth() - 1);
    }
}

// --- 5. UI И РЕНДЕР ---

function init() {
    loadData();
    
    // Генерируем вкладки на основе данных
    generateMonthTabs();
    
    // Активный месяц по умолчанию — первый в списке (Текущий)
    if (!activeMonthId) {
        activeMonthId = monthsToShow[0].id;
    }

    const dateStr = today.toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    dateHeader.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const inputCash = document.getElementById('inputCash');
    const inputTips = document.getElementById('inputTips');

    inputCash.addEventListener('keydown', handleCalcInput);
    inputTips.addEventListener('keydown', handleCalcInput);
    inputCash.addEventListener('input', handleInputAndSave);
    inputTips.addEventListener('input', handleInputAndSave);

    renderTabs();     
    loadValuesToInputs(); 
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

function loadValuesToInputs() {
    const inputCash = document.getElementById('inputCash');
    const inputTips = document.getElementById('inputTips');
    
    // Логика "Чтение" vs "Редактирование"
    const currentMonthId = monthsToShow[0].id; // Самый свежий месяц всегда первый

    // Настраиваем поля
    if (activeMonthId === currentMonthId) {
        // Если это ТЕКУЩИЙ месяц
        inputCash.removeAttribute('readonly');
        inputTips.removeAttribute('readonly');
        inputCash.placeholder = "0";
        document.querySelector('.status-hint').innerText = 'Сохраняется автоматически';
    } else {
        // Если это АРХИВ
        // Мы все равно разрешаем редактировать (как вы просили), 
        // но визуально можно дать понять пользователю где он
        inputCash.removeAttribute('readonly'); // Оставляем редактируемым по вашей просьбе
        inputTips.removeAttribute('readonly');
        document.querySelector('.status-hint').innerText = `Редактирование архива за ${monthsToShow.find(m => m.id === activeMonthId)?.label}`;
    }

    // Загружаем данные в строку
    const currentMonthTrans = transactions.filter(t => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${d.getMonth()}` === activeMonthId;
    });

    const cashParts = currentMonthTrans.filter(t => t.type === 'cash').map(t => t.amount);
    const tipsParts = currentMonthTrans.filter(t => t.type === 'tips').map(t => t.amount);

    inputCash.value = cashParts.join('+');
    inputTips.value = tipsParts.join('+');
}

function formatMoney(num) { return num.toLocaleString('ru-RU') + ' ₽'; }
function formatMoneyShort(num) { return num.toLocaleString('ru-RU'); }

function renderTabsHeaderOnly() {
    monthsToShow.forEach(m => {
        const stats = getMonthStats(m.id);
        const card = document.getElementById(`card-${m.id}`);
        if (card) {
            card.querySelector('.m-total').innerText = formatMoney(stats.total);
            card.querySelector('.pill.cash').innerText = formatMoneyShort(stats.cash);
            card.querySelector('.pill.tips').innerText = formatMoneyShort(stats.tips);
        }
    });
}

function renderTabs() {
    monthTabsContainer.innerHTML = '';
    
    // Если вдруг вкладок стало больше (при наступлении нового месяца), перегенерируем
    // Но для простоты UI делаем это при инициализации. 
    // Здесь просто отрисовываем то, что есть в monthsToShow.
    
    monthsToShow.forEach(m => {
        const stats = getMonthStats(m.id);
        const div = document.createElement('div');
        div.id = `card-${m.id}`;
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
            loadValuesToInputs(); 
        };
        
        monthTabsContainer.appendChild(div);
    });
}

init();