// ==========================================
// 1. CONSTANTS & INITIAL STATE
// ==========================================

const DRINKS = {
  black: {
    name: '블랙커피',
    price: 500,
    recipe: { coffee: 1, water: 1 },
    icon: '☕'
  },
  milk: {
    name: '밀크커피',
    price: 700,
    recipe: { coffee: 1, prim: 1, milk: 1, water: 1 },
    icon: '🥛'
  },
  yulmu: {
    name: '율무차',
    price: 600,
    recipe: { yulmu: 2, water: 1 },
    icon: '🌾'
  },
  cocoa: {
    name: '코코아',
    price: 700,
    recipe: { milk: 1, cocoa: 2, water: 1 },
    icon: '🍫'
  }
};

const state = {
  ingredients: {
    coffee: 20,
    water: 20,
    prim: 20,
    milk: 20,
    yulmu: 20,
    cocoa: 20
  },
  vault: {
    1000: 10,
    500: 10,
    100: 10
  },
  insertedMoney: 0,
  insertedCoins: {
    1000: 0,
    500: 0,
    100: 0
  },
  totalSales: 0,
  isAdmin: false
};

// Ingredient Korean Labels
const INGREDIENT_LABELS = {
  coffee: '커피가루',
  water: '물',
  prim: '프림',
  milk: '우유',
  yulmu: '율무가루',
  cocoa: '코코아가루'
};

// ==========================================
// 2. DOM ELEMENTS
// ==========================================

const elDisplayBalance = document.getElementById('display-balance');
const elTerminalConsole = document.getElementById('terminal-console');
const elDispenserTray = document.getElementById('dispenser-tray');
const elDispenserLight = document.getElementById('dispenser-light');

// Buttons
const btnInsert1000 = document.getElementById('btn-insert-1000');
const btnInsert500 = document.getElementById('btn-insert-500');
const btnInsert100 = document.getElementById('btn-insert-100');
const btnOpenLogin = document.getElementById('btn-open-login');
const btnCloseLogin = document.getElementById('btn-close-login');
const btnSubmitLogin = document.getElementById('btn-submit-login');
const btnCloseAdmin = document.getElementById('btn-close-admin');
const btnAdminLogout = document.getElementById('btn-admin-logout');

// Modals
const modalLogin = document.getElementById('modal-login');
const modalAdmin = document.getElementById('modal-admin');
const formLogin = document.getElementById('form-login');
const inputAdminId = document.getElementById('admin-id');
const inputAdminPw = document.getElementById('admin-pw');

// Admin Panel Lists
const elAdminIngredientsList = document.getElementById('admin-ingredients-list');
const elAdminVaultList = document.getElementById('admin-vault-list');
const elAdminVaultTotal = document.getElementById('admin-vault-total');
const elAdminSalesTotal = document.getElementById('admin-sales-total');

// ==========================================
// 3. CORE LOGIC FUNCTIONS
// ==========================================

// Log to Virtual Console
function logMessage(text, type = 'info') {
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  
  const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  line.innerHTML = `<span>[${time}]</span> <span>${text}</span>`;
  
  elTerminalConsole.appendChild(line);
  elTerminalConsole.scrollTop = elTerminalConsole.scrollHeight;
}

// Calculate sum of vault
function getVaultTotal() {
  return (state.vault[1000] * 1000) + (state.vault[500] * 500) + (state.vault[100] * 100);
}

// Greedy Change Distribution Algorithm
function getChangeDistribution(changeAmount, vaultState) {
  const denominations = [1000, 500, 100];
  const distribution = { 1000: 0, 500: 0, 100: 0 };
  let remaining = changeAmount;

  for (const denom of denominations) {
    const countNeeded = Math.floor(remaining / denom);
    const countToUse = Math.min(countNeeded, vaultState[denom]);
    distribution[denom] = countToUse;
    remaining -= countToUse * denom;
  }

  if (remaining === 0) {
    return distribution;
  }
  return null; // Change cannot be fully provided
}

// Check if ingredients are sufficient
function hasEnoughIngredients(recipe) {
  for (const [ing, amount] of Object.entries(recipe)) {
    if ((state.ingredients[ing] || 0) < amount) {
      return false;
    }
  }
  return true;
}

// Deduct ingredients based on recipe
function consumeIngredients(recipe) {
  for (const [ing, amount] of Object.entries(recipe)) {
    state.ingredients[ing] -= amount;
  }
}

// Handle cash insertion
function insertMoney(amount) {
  state.insertedMoney += amount;
  state.insertedCoins[amount]++;
  state.vault[amount]++;
  
  logMessage(`${amount.toLocaleString()}원이 투입되었습니다. (현재 투입금액: ${state.insertedMoney.toLocaleString()}원)`, 'info');
  renderUI();
}

// Refund / Return all inserted coins (Cancel Transaction / Rollback)
function refundInsertedMoney(reason = '') {
  if (state.insertedMoney === 0) return;
  
  // Return the exact coin types inserted
  for (const [denom, count] of Object.entries(state.insertedCoins)) {
    state.vault[denom] -= count;
  }
  
  const refundAmount = state.insertedMoney;
  
  // Format details of coins returned
  const returnedDetails = [];
  if (state.insertedCoins[1000] > 0) returnedDetails.push(`1,000원 ${state.insertedCoins[1000]}장`);
  if (state.insertedCoins[500] > 0) returnedDetails.push(`500원 ${state.insertedCoins[500]}개`);
  if (state.insertedCoins[100] > 0) returnedDetails.push(`100원 ${state.insertedCoins[100]}개`);
  
  const detailsStr = returnedDetails.join(', ');
  
  logMessage(`${reason ? reason + ' ' : ''}투입금액 ${refundAmount.toLocaleString()}원이 반환되었습니다. (${detailsStr})`, 'warning');
  
  // Clear dispenser tray first and dispense coins
  elDispenserTray.querySelectorAll('.dispensed-item').forEach(el => el.remove());
  dispenseChange(state.insertedCoins);

  // Reset insert state
  state.insertedMoney = 0;
  state.insertedCoins = { 1000: 0, 500: 0, 100: 0 };
  
  triggerLightEffect('error');
  renderUI();
}

// Trigger LED light flashes in dispenser tray
function triggerLightEffect(type) {
  elDispenserLight.className = `dispenser-light ${type}`;
  setTimeout(() => {
    elDispenserLight.className = 'dispenser-light';
  }, 1500);
}

// Attempt to purchase a drink
function purchaseDrink(drinkKey) {
  const drink = DRINKS[drinkKey];
  if (!drink) return;

  logMessage(`${drink.name} 구매를 시도합니다...`, 'info');

  // 1. Check if enough money inserted
  if (state.insertedMoney < drink.price) {
    logMessage(`금액이 부족합니다. (${drink.name}: ${drink.price.toLocaleString()}원 / 투입액: ${state.insertedMoney.toLocaleString()}원)`, 'error');
    triggerLightEffect('error');
    return;
  }

  // 2. Check if ingredients are available
  if (!hasEnoughIngredients(drink.recipe)) {
    logMessage(`재료가 부족하여 ${drink.name}을(를) 제작할 수 없습니다.`, 'error');
    triggerLightEffect('error');
    return;
  }

  // 3. Calculate Change Needed
  const changeNeeded = state.insertedMoney - drink.price;
  
  // 4. Verify if exact change can be returned from the vault (which already contains the inserted coins)
  const changeDistribution = getChangeDistribution(changeNeeded, state.vault);
  
  if (changeDistribution === null) {
    // EXCEPTION: Cannot return exact change. Rollback transaction.
    logMessage(`[예외 발생] 자판기 내 잔돈이 부족하여 거스름돈을 반환할 수 없습니다.`, 'error');
    refundInsertedMoney('구매 실패로 인해');
    return;
  }

  // 5. Success Path: Commit Transaction
  // Deduct ingredients
  consumeIngredients(drink.recipe);
  
  // Deduct change from vault
  for (const [denom, count] of Object.entries(changeDistribution)) {
    state.vault[denom] -= count;
  }
  
  // Record sales
  state.totalSales += drink.price;
  
  // Dispense drink and change
  dispenseItem(drink);
  if (changeNeeded > 0) {
    dispenseChange(changeDistribution);
  }
  
  // Build change message
  let changeMsg = '';
  if (changeNeeded > 0) {
    const changeDetails = [];
    if (changeDistribution[1000] > 0) changeDetails.push(`1,000원 ${changeDistribution[1000]}장`);
    if (changeDistribution[500] > 0) changeDetails.push(`500원 ${changeDistribution[500]}개`);
    if (changeDistribution[100] > 0) changeDetails.push(`100원 ${changeDistribution[100]}개`);
    changeMsg = `거스름돈 ${changeNeeded.toLocaleString()}원(${changeDetails.join(', ')})이 반환되었습니다.`;
  } else {
    changeMsg = '거스름돈은 없습니다.';
  }
  
  logMessage(`[성공] ${drink.name}이(가) 나왔습니다. ${changeMsg}`, 'success');
  
  // Reset insert state
  state.insertedMoney = 0;
  state.insertedCoins = { 1000: 0, 500: 0, 100: 0 };
  
  triggerLightEffect('active');
  renderUI();
}

// Display dispensed drink emoji in dispenser tray
function dispenseItem(drink) {
    // Clear previous items
    elDispenserTray.querySelectorAll('.dispensed-item').forEach(el => el.remove());
    
    const item = document.createElement('div');
    item.className = 'dispensed-item';
    item.innerHTML = drink.icon;
    item.title = `${drink.name} (클릭하여 수령)`;
    
    // Pick up drink event
    item.addEventListener('click', () => {
      item.remove();
      logMessage(`${drink.name}을(를) 꺼냈습니다. 맛있게 드세요!`, 'success');
    });
    
    elDispenserTray.appendChild(item);
  }

// Display dispensed change in dispenser tray
function dispenseChange(changeDistribution) {
  const denoms = [1000, 500, 100];
  const coinIcons = {
    1000: '💵',
    500: '🪙',
    100: '🪙'
  };
  
  for (const denom of denoms) {
    const count = changeDistribution[denom] || 0;
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'dispensed-item dispensed-change';
      item.innerHTML = coinIcons[denom];
      
      const label = denom === 1000 ? '1,000원 지폐' : `${denom}원 동전`;
      item.title = `${label} (클릭하여 수령)`;
      
      // Add custom styles dynamically to style different coins/bills
      if (denom === 1000) {
        item.style.color = '#10b981';
        item.style.fontSize = '2.4rem';
      } else if (denom === 500) {
        item.style.color = '#f59e0b';
        item.style.fontSize = '1.8rem';
      } else {
        item.style.color = '#94a3b8';
        item.style.fontSize = '1.5rem';
      }
      item.style.margin = '0.2rem';
      
      item.addEventListener('click', () => {
        item.remove();
        logMessage(`${label}을(를) 꺼냈습니다.`, 'success');
      });
      
      elDispenserTray.appendChild(item);
    }
  }
}

// ==========================================
// 4. RENDERING & UI UPDATES
// ==========================================

function renderUI() {
  // Update Inserted Balance Display
  elDisplayBalance.textContent = `${state.insertedMoney.toLocaleString()}원`;
  
  // Update purchase buttons based on price and ingredients
  for (const [key, drink] of Object.entries(DRINKS)) {
    const card = document.getElementById(`drink-${key}`);
    const button = document.getElementById(`btn-buy-${key}`);
    const outOfStock = !hasEnoughIngredients(drink.recipe);
    
    // Check if card has a sold out badge
    let badge = card.querySelector('.sold-out-badge');
    
    if (outOfStock) {
      card.classList.add('sold-out');
      button.disabled = true;
      button.textContent = '품절';
      
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'sold-out-badge';
        badge.textContent = 'SOLD OUT';
        card.appendChild(badge);
      }
    } else {
      card.classList.remove('sold-out');
      button.disabled = false;
      button.textContent = '선택';
      if (badge) {
        badge.remove();
      }
    }
  }

  // Render Admin Panel if logged in
  if (state.isAdmin) {
    renderAdminPanel();
  }
}

function renderAdminPanel() {
  // 1. Render Ingredients
  elAdminIngredientsList.innerHTML = '';
  for (const [ing, count] of Object.entries(state.ingredients)) {
    const isLow = count <= 2;
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="item-info">
        <span class="item-name">${INGREDIENT_LABELS[ing]}</span>
        <span class="item-count ${isLow ? 'low-stock' : 'highlight'}">${count}개</span>
      </div>
      <button class="btn-refill" onclick="refillIngredient('${ing}')">+10 충전</button>
    `;
    elAdminIngredientsList.appendChild(item);
  }

  // 2. Render Vault
  elAdminVaultList.innerHTML = '';
  const coins = [1000, 500, 100];
  for (const coin of coins) {
    const count = state.vault[coin];
    const isLow = count <= 2;
    const label = coin === 1000 ? '1,000원 지폐' : `${coin}원 동전`;
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="item-info">
        <span class="item-name">${label}</span>
        <span class="item-count ${isLow ? 'low-stock' : 'highlight'}">${count}개</span>
      </div>
      <button class="btn-refill" onclick="refillVault('${coin}')">+5개 충전</button>
    `;
    elAdminVaultList.appendChild(item);
  }

  // 3. Summaries
  elAdminVaultTotal.textContent = `${getVaultTotal().toLocaleString()}원`;
  elAdminSalesTotal.textContent = `${state.totalSales.toLocaleString()}원`;
}

// Global functions for admin action clicks (bound in string HTML templates)
window.refillIngredient = function(ing) {
  state.ingredients[ing] += 10;
  logMessage(`[관리자] ${INGREDIENT_LABELS[ing]} 재고가 10개 충전되었습니다.`, 'success');
  renderUI();
};

window.refillVault = function(coin) {
  state.vault[coin] += 5;
  const label = coin == 1000 ? '1,000원 지폐' : `${coin}원 동전`;
  logMessage(`[관리자] ${label}가 5개 충전되었습니다.`, 'success');
  renderUI();
};

// ==========================================
// 5. EVENT BINDING & INITIALIZATION
// ==========================================

// Insert Buttons
btnInsert1000.addEventListener('click', () => insertMoney(1000));
btnInsert500.addEventListener('click', () => insertMoney(500));
btnInsert100.addEventListener('click', () => insertMoney(100));

// Purchase Buttons
document.querySelectorAll('.btn-purchase').forEach(button => {
  button.addEventListener('click', (e) => {
    const drinkKey = e.target.getAttribute('data-drink');
    purchaseDrink(drinkKey);
  });
});

// Admin Login Dialog Show/Hide
btnOpenLogin.addEventListener('click', () => {
  if (state.isAdmin) {
    modalAdmin.classList.add('active');
    renderAdminPanel();
  } else {
    modalLogin.classList.add('active');
    inputAdminId.value = '';
    inputAdminPw.value = '';
    inputAdminId.focus();
  }
});

btnCloseLogin.addEventListener('click', () => {
  modalLogin.classList.remove('active');
});

btnCloseAdmin.addEventListener('click', () => {
  modalAdmin.classList.remove('active');
});

// Login Submit
formLogin.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = inputAdminId.value.trim();
  const pw = inputAdminPw.value.trim();

  // Accept admin/admin or admin/1234
  if (id === 'admin' && (pw === 'admin' || pw === '1234')) {
    state.isAdmin = true;
    modalLogin.classList.remove('active');
    modalAdmin.classList.add('active');
    logMessage('[시스템] 관리자 모드로 로그인하였습니다.', 'success');
    renderUI();
  } else {
    alert('아이디 또는 비밀번호가 잘못되었습니다.');
    logMessage('[보안경고] 관리자 로그인 시도가 실패하였습니다.', 'error');
  }
});

// Logout
btnAdminLogout.addEventListener('click', () => {
  state.isAdmin = false;
  modalAdmin.classList.remove('active');
  logMessage('[시스템] 관리자 세션이 종료되었습니다.', 'info');
  renderUI();
});

// Add Refund option dynamically to dispenser area to enhance user experience
const refundBtnContainer = document.createElement('div');
refundBtnContainer.style.marginTop = '1rem';
refundBtnContainer.style.textAlign = 'right';

const btnRefund = document.createElement('button');
btnRefund.className = 'btn-refill';
btnRefund.style.width = '100%';
btnRefund.style.padding = '0.6rem';
btnRefund.style.borderRadius = '12px';
btnRefund.style.background = 'rgba(239, 68, 68, 0.1)';
btnRefund.style.borderColor = 'rgba(239, 68, 68, 0.3)';
btnRefund.style.color = '#f87171';
btnRefund.innerText = '🪙 투입금액 반환';
btnRefund.addEventListener('click', () => {
  if (state.insertedMoney > 0) {
    refundInsertedMoney('사용자 취소로 인해');
  } else {
    logMessage('반환할 투입 금액이 없습니다.', 'warning');
  }
});

// Append after coin inputs
document.querySelector('.coin-slot').after(refundBtnContainer);
refundBtnContainer.appendChild(btnRefund);

// Initialize Vending Machine UI
renderUI();
logMessage('자판기 시스템이 정상적으로 시작되었습니다.', 'success');
logMessage('기본 보유 잔돈: 1,000원 10장, 500원 10개, 100원 10개', 'info');
logMessage('초기 재료: 모든 재료 각 20개씩 탑재됨.', 'info');
