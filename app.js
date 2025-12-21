// DOM Elements
const productsContainer = document.getElementById('products-container');
const cartCount = document.getElementById('cart-count');
const cartItems = document.getElementById('cart-items');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartTotal = document.getElementById('cart-total');
const deliveryCharge = document.getElementById('delivery-charge');
const checkoutBtn = document.getElementById('checkout-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// State
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartCount();
    setupEventListeners();
    checkAuthState();
});

// Load Products
async function loadProducts() {
    try {
        // Load from products.json first
        const response = await fetch('products.json');
        const data = await response.json();
        products = data.products;
        
        // Try to load from Firebase for real-time updates
        const productsSnapshot = await db.collection('products').get();
        if (!productsSnapshot.empty) {
            products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        // Fallback to local products
        displayProducts(products);
    }
}

// Display Products
function displayProducts(productsToDisplay) {
    productsContainer.innerHTML = '';
    
    productsToDisplay.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=Product+Image'">
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="product-price">₹${product.price}</div>
                <div class="product-stock">Stock: ${product.stock}</div>
                <button class="btn-add-to-cart" 
                        onclick="addToCart(${product.id})"
                        ${product.stock <= 0 ? 'disabled' : ''}>
                    ${product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
}

// Cart Functions
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            alert('Cannot add more than available stock');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    updateCart();
    saveCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
    saveCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > product.stock) {
        alert('Cannot add more than available stock');
        return;
    }
    
    item.quantity = newQuantity;
    updateCart();
    saveCart();
}

function updateCart() {
    updateCartCount();
    updateCartDisplay();
}

function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function updateCartDisplay() {
    if (!cartItems) return;
    
    cartItems.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div>₹${item.price} × ${item.quantity}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
            <div class="cart-item-price">₹${itemTotal}</div>
            <button class="remove-item" onclick="removeFromCart(${item.id})">×</button>
        `;
        cartItems.appendChild(cartItem);
    });
    
    // Calculate delivery (free within 5km, for demo we'll use fixed charge)
    const delivery = cart.length > 0 ? 50 : 0;
    
    cartSubtotal.textContent = subtotal;
    deliveryCharge.textContent = delivery;
    cartTotal.textContent = subtotal + delivery;
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Checkout Functions
function openCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    if (!currentUser) {
        alert('Please login to continue');
        openLoginModal();
        return;
    }
    
    document.getElementById('checkout-modal').style.display = 'block';
    updateOrderSummary();
}

function updateOrderSummary() {
    const orderSummary = document.getElementById('order-summary');
    let subtotal = 0;
    let html = '<div class="order-items">';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        html += `
            <div class="order-item">
                <span>${item.name} × ${item.quantity}</span>
                <span>₹${itemTotal}</span>
            </div>
        `;
    });
    
    const delivery = 50; // For demo
    const total = subtotal + delivery;
    
    html += `
        <div class="order-total">
            <hr>
            <div class="order-subtotal">
                <span>Subtotal:</span>
                <span>₹${subtotal}</span>
            </div>
            <div class="order-delivery">
                <span>Delivery:</span>
                <span>₹${delivery}</span>
            </div>
            <div class="order-grand-total">
                <strong>Total:</strong>
                <strong>₹${total}</strong>
            </div>
        </div>
    `;
    
    orderSummary.innerHTML = html;
}

async function submitOrder(formData) {
    try {
        const orderData = {
            customer: {
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                pincode: formData.pincode,
                landmark: formData.landmark
            },
            items: cart,
            subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            delivery: 50,
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50,
            paymentMethod: formData.payment,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: currentUser.uid
        };
        
        // Save order to Firebase
        const orderRef = await db.collection('orders').add(orderData);
        
        // Update stock
        await updateStock();
        
        // Send WhatsApp alerts
        await sendWhatsAppAlert(orderRef.id, orderData);
        
        // Generate invoice
        await generateInvoice(orderRef.id, orderData);
        
        // Clear cart
        cart = [];
        saveCart();
        updateCart();
        
        // Redirect to success page
        window.location.href = 'success.html?order=' + orderRef.id;
        
    } catch (error) {
        console.error('Error submitting order:', error);
        alert('Error placing order. Please try again.');
    }
}

async function updateStock() {
    const batch = db.batch();
    
    cart.forEach(item => {
        const productRef = db.collection('products').doc(item.id.toString());
        batch.update(productRef, {
            stock: firebase.firestore.FieldValue.increment(-item.quantity)
        });
    });
    
    await batch.commit();
}

async function sendWhatsAppAlert(orderId, orderData) {
    const adminPhone = '917006927825';
    const customerPhone = orderData.customer.phone;
    
    const message = `New Order #${orderId}\n` +
                   `Customer: ${orderData.customer.name}\n` +
                   `Total: ₹${orderData.total}\n` +
                   `Payment: ${orderData.paymentMethod}\n` +
                   `View order: ${window.location.origin}/admin.html`;
    
    // Send to admin
    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
    
    // Send to customer
    const customerMessage = `Thank you for your order #${orderId}\n` +
                          `We'll deliver to: ${orderData.customer.address}\n` +
                          `Total: ₹${orderData.total}\n` +
                          `Payment: ${orderData.paymentMethod}`;
    
    window.open(`https://wa.me/${customerPhone}?text=${encodeURIComponent(customerMessage)}`, '_blank');
}

function generateInvoice(orderId, orderData) {
    // Simple invoice generation (could use jsPDF for PDF generation)
    const invoiceContent = `
        SARM ENTERPRISES
        KAWOOSA KHALISA, NARBAL, BADGAM
        Phone: 7006927825
        Email: mir7amir@gmail.com
        
        INVOICE #${orderId}
        Date: ${new Date().toLocaleDateString()}
        
        Customer Details:
        Name: ${orderData.customer.name}
        Phone: ${orderData.customer.phone}
        Address: ${orderData.customer.address}
        Pincode: ${orderData.customer.pincode}
        Landmark: ${orderData.customer.landmark}
        
        Items:
        ${orderData.items.map(item => 
            `${item.name} × ${item.quantity} = ₹${item.price * item.quantity}`
        ).join('\n')}
        
        Subtotal: ₹${orderData.subtotal}
        Delivery: ₹${orderData.delivery}
        Total: ₹${orderData.total}
        
        Payment Method: ${orderData.paymentMethod}
        
        Thank you for your business!
    `;
    
    // Save invoice to Firebase Storage
    const storageRef = storage.ref().child(`invoices/${orderId}.txt`);
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    storageRef.put(blob);
    
    return invoiceContent;
}

// Authentication Functions
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
        }
    });
}

function openLoginModal() {
    document.getElementById('login-modal').style.display = 'block';
}

function openRegisterModal() {
    document.getElementById('register-modal').style.display = 'block';
}

async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        document.getElementById('login-modal').style.display = 'none';
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function register(name, email, password, phone) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        
        // Save additional user data to Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            phone: phone,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('register-modal').style.display = 'none';
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

async function logout() {
    try {
        await auth.signOut();
        cart = [];
        saveCart();
        updateCart();
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Cart modal
    const cartModal = document.getElementById('cart-modal');
    const cartBtn = document.querySelector('a[href="#cart"]');
    const closeCart = document.querySelector('.close');
    
    cartBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        cartModal.style.display = 'block';
        updateCartDisplay();
    });
    
    closeCart?.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
    
    // Checkout
    checkoutBtn?.addEventListener('click', openCheckout);
    
    // Checkout modal
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckout = document.querySelector('.close-checkout');
    
    closeCheckout?.addEventListener('click', () => {
        checkoutModal.style.display = 'none';
    });
    
    // Checkout form
    document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            name: e.target[0].value,
            phone: e.target[1].value,
            address: e.target[2].value,
            pincode: e.target[3].value,
            landmark: e.target[4].value,
            payment: document.querySelector('input[name="payment"]:checked').value
        };
        
        await submitOrder(formData);
    });
    
    // Login/Register modals
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const closeLogin = document.querySelector('.close-login');
    const closeRegister = document.querySelector('.close-register');
    
    loginBtn?.addEventListener('click', openLoginModal);
    logoutBtn?.addEventListener('click', logout);
    
    closeLogin?.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
    
    closeRegister?.addEventListener('click', () => {
        registerModal.style.display = 'none';
    });
    
    // Login form
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        login(email, password);
    });
    
    // Register form
    document.getElementById('register-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const phone = document.getElementById('register-phone').value;
        register(name, email, password, phone);
    });
    
    // Switch between login and register
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'block';
    });
    
    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.style.display = 'none';
        loginModal.style.display = 'block';
    });
    
    // Category filter
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            if (category === 'all') {
                displayProducts(products);
            } else {
                const filtered = products.filter(p => p.category === category);
                displayProducts(filtered);
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Global functions for HTML onclick
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
