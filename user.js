/* ==============================
   user.js - User-Specific Logic
   အပိုင်း ၁ (Line 1 - 300)
   Wishlist, Address Book, Profile Update,
   Real-time Sync & UI Rendering
   ============================== */

'use strict';

// ---------- User Identity (Anonymous) ----------
const USER_ID_KEY = 'device_user_id';
let currentUserId = localStorage.getItem(USER_ID_KEY);
if (!currentUserId) {
  currentUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem(USER_ID_KEY, currentUserId);
}

// ---------- Firestore References ----------
const db = window.AppConfig?.db;
const wishlistCollection = db.collection('wishlists');
const addressCollection = db.collection('addresses');
const usersCollection = db.collection('users');

// ---------- Wishlist Management ----------
/**
 * Wishlist ထဲသို့ ပစ္စည်းထည့်ခြင်း
 * @param {string} productId 
 */
async function addToWishlist(productId) {
  try {
    // ရှိပြီးသားလား စစ်ဆေးခြင်း
    const existing = await wishlistCollection
      .where('userId', '==', currentUserId)
      .where('productId', '==', productId)
      .get();
    if (!existing.empty) {
      alert('ဤပစ္စည်း Wishlist ထဲတွင် ရှိပြီးသားဖြစ်ပါသည်');
      return;
    }
    await wishlistCollection.add({
      userId: currentUserId,
      productId: productId,
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Wishlist ထဲသို့ ထည့်ပြီးပါပြီ');
    // UI ရှိ ခလုတ်ကို ပြောင်းလဲရန် (optional)
  } catch (error) {
    console.error('Add to wishlist error:', error);
    alert('မအောင်မြင်ပါ');
  }
}

/**
 * Wishlist မှ ဖယ်ရှားခြင်း
 */
async function removeFromWishlist(productId) {
  try {
    const snapshot = await wishlistCollection
      .where('userId', '==', currentUserId)
      .where('productId', '==', productId)
      .get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    alert('Wishlist မှ ဖယ်ရှားပြီးပါပြီ');
    // စာမျက်နှာကို ပြန်ဆွဲရန်
    if (window.location.hash === '#wishlist') {
      renderWishlistPage();
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Wishlist စာမျက်နှာပြသခြင်း
 */
async function renderWishlistPage() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  try {
    const snapshot = await wishlistCollection
      .where('userId', '==', currentUserId)
      .orderBy('addedAt', 'desc')
      .get();
    const productIds = [];
    snapshot.forEach(doc => productIds.push(doc.data().productId));

    if (productIds.length === 0) {
      mainContent.innerHTML = `<div class="container text-center mt-4"><i class="fa-solid fa-heart-broken fa-3x"></i><p>Wishlist ဗလာဖြစ်နေပါသည်</p></div>`;
      return;
    }

    // Product IDs များကို အသုံးပြု၍ အသေးစိတ်ဆွဲခြင်း
    const products = [];
    for (const id of productIds) {
      const doc = await db.collection('products').doc(id).get();
      if (doc.exists) {
        products.push({ id: doc.id, ...doc.data() });
      }
    }

    let html = '<div class="container"><h2><i class="fa-solid fa-heart" style="color:var(--primary);"></i> သိမ်းထားသောပစ္စည်းများ</h2><div class="products-grid">';
    products.forEach(p => {
      html += buildWishlistCard(p);
    });
    html += '</div></div>';
    mainContent.innerHTML = html;
  } catch (error) {
    mainContent.innerHTML = '<div class="container">Wishlist မရယူနိုင်ပါ</div>';
  }
}

function buildWishlistCard(product) {
  const { id, name, image, price, originalPrice, discountPercent } = product;
  const discountBadge = discountPercent > 0 ? `<span class="discount-badge">-${discountPercent}%</span>` : '';
  return `
    <div class="product-card">
      ${discountBadge}
      <img class="product-img" src="${image || ''}" alt="${name}" onclick="window.navigateTo('product/${id}')">
      <div class="product-card-body">
        <div class="product-name">${name}</div>
        <div class="price-row">
          <span class="discounted-price">Ks ${(price || 0).toLocaleString()}</span>
          ${originalPrice > price ? `<span class="original-price">Ks ${originalPrice.toLocaleString()}</span>` : ''}
        </div>
        <button class="checkout-btn" style="margin-top:8px; padding:6px; font-size:12px; background:#ef4444;" onclick="removeFromWishlist('${id}')">
          <i class="fa-solid fa-trash"></i> ဖယ်ရှားမည်
        </button>
      </div>
    </div>`;
}

// ---------- Address Management ----------
/**
 * လိပ်စာအသစ်ထည့်ခြင်း
 */
async function addAddress(addressData) {
  try {
    await addressCollection.add({
      userId: currentUserId,
      ...addressData,
      isDefault: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('လိပ်စာထည့်ပြီးပါပြီ');
  } catch (e) {
    alert('မအောင်မြင်ပါ');
  }
}

/**
 * လိပ်စာများရယူခြင်း
 */
async function getUserAddresses() {
  const snapshot = await addressCollection
    .where('userId', '==', currentUserId)
    .orderBy('createdAt', 'desc')
    .get();
  const addresses = [];
  snapshot.forEach(doc => addresses.push({ id: doc.id, ...doc.data() }));
  return addresses;
}

/**
 * လိပ်စာ ပင်မသတ်မှတ်ခြင်း
 */
async function setDefaultAddress(addressId) {
  // ရှိသမျှကို false လုပ်ပြီး ရွေးထားသည်ကို true
  const batch = db.batch();
  const all = await addressCollection.where('userId', '==', currentUserId).get();
  all.forEach(doc => {
    batch.update(doc.ref, { isDefault: doc.id === addressId });
  });
  await batch.commit();
  alert('ပင်မလိပ်စာ ပြောင်းလဲပြီးပါပြီ');
}

/**
 * လိပ်စာ ဖျက်ခြင်း
 */
async function deleteAddress(addressId) {
  if (!confirm('ဖျက်ရန်သေချာပါသလား?')) return;
  await addressCollection.doc(addressId).delete();
  alert('ဖျက်ပြီးပါပြီ');
}

/**
 * Shipping Address စာမျက်နှာ (#address) ပြသခြင်း
 */
async function renderAddressPage() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  const addresses = await getUserAddresses();
  let html = `<div class="container"><h2><i class="fa-solid fa-map-location-dot"></i> ပို့ဆောင်ရန်လိပ်စာများ</h2>`;
  if (addresses.length === 0) {
    html += '<p>လိပ်စာမရှိသေးပါ</p>';
  } else {
    addresses.forEach(addr => {
      html += `
        <div class="product-card" style="margin-bottom:12px; padding:12px;">
          <p><strong>${addr.name}</strong> ${addr.isDefault ? '<span style="color:var(--primary);">(ပင်မ)</span>' : ''}</p>
          <p>${addr.phone}</p>
          <p>${addr.fullAddress}</p>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button class="icon-btn" onclick="setDefaultAddress('${addr.id}')"><i class="fa-solid fa-check-circle"></i></button>
            <button class="icon-btn" onclick="deleteAddress('${addr.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
    });
  }
  html += `
    <div class="form-group" style="margin-top:20px;">
      <h3>လိပ်စာအသစ်ထည့်ရန်</h3>
      <input type="text" id="new-addr-name" placeholder="အမည်">
      <input type="text" id="new-addr-phone" placeholder="ဖုန်း">
      <textarea id="new-addr-full" rows="2" placeholder="လိပ်စာအပြည့်အစုံ"></textarea>
      <button class="checkout-btn" onclick="submitNewAddress()">ထည့်မည်</button>
    </div>
  </div>`;
  mainContent.innerHTML = html;
}

async function submitNewAddress() {
  const name = document.getElementById('new-addr-name').value.trim();
  const phone = document.getElementById('new-addr-phone').value.trim();
  const fullAddress = document.getElementById('new-addr-full').value.trim();
  if (!name || !phone || !fullAddress) return alert('အားလုံးဖြည့်ပါ');
  await addAddress({ name, phone, fullAddress });
  renderAddressPage();
}

// ---------- User Profile Update ----------
async function updateUserProfile(data) {
  try {
    await usersCollection.doc(currentUserId).set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    localStorage.setItem('user', JSON.stringify(data));
    alert('ပရိုဖိုင်မွမ်းမံပြီးပါပြီ');
  } catch (e) {
    alert('မအောင်မြင်ပါ');
  }
}

// ---------- Page Render Overwrites (Integration with main.js) ----------
// main.js ၏ placeholder render functions များကို အစားထိုးရန်
// ဤ function များသည် main.js တွင် ခေါ်သုံးထားပါက user.js က ပြန်လည်သတ်မှတ်ပေးမည်။

// Wishlist page route (#wishlist)
window.renderWishlist = renderWishlistPage;
// Address page route (#address)
window.renderAddress = renderAddressPage;

// main.js ရှိ placeholder များကို အစားထိုးရန် (main.js သည် user.js ကို နောက်မှ load လုပ်ပါက ပြန်ရေးရန်)
// သို့သော် main.js သည် defer သို့မဟုတ် module ဖြစ်နိုင်သဖြင့် ဤနေရာတွင် တိုက်ရိုက် ထည့်မည်။
document.addEventListener('DOMContentLoaded', () => {
  // အထက်ပါ function များကို main.js ၏ placeholder များနှင့် ချိတ်ဆက်ရန်
  if (window.renderWishlist) {
    // main.js ၏ function အမည် နှင့် ကိုက်ညီအောင် လုပ်မည်
    window._originalRenderFunctions = {
      wishlist: window.renderWishlist,
      address: window.renderAddress
    };
  }
});

// ---------- Auto-reply AI (Optional Enhancement) ----------
// Main.js ရှိ autoReply ကို ပိုမိုကောင်းမွန်အောင် ပြုလုပ်နိုင်သည်။
// သို့သော် ဤနေရာတွင် အခြေခံအတိုင်းထားပါ။

// ---------- Export to Global ----------
window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;
window.setDefaultAddress = setDefaultAddress;
window.deleteAddress = deleteAddress;
window.submitNewAddress = submitNewAddress;
window.updateUserProfile = updateUserProfile;

console.log('👤 User.js loaded - Wishlist, Address, Profile ready.');
// ========== LINE 300 ==========

