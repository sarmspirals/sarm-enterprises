// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize cart from localStorage
    let cart = JSON.parse(localStorage.getItem('sarm_cart')) || [];
    let currentUser = null;
    let products = [];

    // DOM References
    const productsContainer = document.getElementById('products-container');
    const cartCount = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartSidebar = document.getElementById('cart-sidebar');
    const checkoutBtn = document.getElementById('checkout-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminLink = document.getElementById('admin-link');
    const userGreeting = document.getElementById('user-greeting');
    const loginModal = document.getElementById('loginModal');
    const checkoutModal = document.getElementById('checkoutModal');

    // Check user authentication state
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-flex';
            userGreeting.textContent = `Hello, ${user.displayName || user.email.split('@')[0]}`;
            
            // Check if user is admin
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().role === 'admin') {
                adminLink.style.display = 'inline-flex';
            }
        } else {
            loginBtn.style.display = 'inline-flex';
            logoutBtn.style.display = 'none';
            adminLink.style.display = 'none';
            userGreeting.textContent = '';
        }
    });

    // Load products from Firebase
    async function loadProducts() {
        try {
            productsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading products...</div>';
            
            const snapshot = await db.collection('products').orderBy('name').get();
            products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
            
            displayProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            productsContainer.innerHTML = '<div class="error-message">Error loading products. Please try again later.</div>';
        }
    }

    // Display products
    function displayProducts(productsToShow) {
        productsContainer.innerHTML = '';
        
        if (productsToShow.length === 0) {
            productsContainer.innerHTML = '<div class="empty-state">No products found.</div>';
            return;
        }
        
        productsToShow.forEach(product => {
            const productCard = createProductCard(product);
            productsContainer.appendChild(productCard);
        });
    }

    // Create product card HTML
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.category = product.category || 'uncategorized';
        
        const inCart = cart.find(item => item.id === product.id);
        const quantityInCart = inCart ? inCart.quantity : 0;
        const availableStock = product.stock - quantityInCart;
        
        card.innerHTML = `
            <div class="product-image">
                ${product.imageUrl ? 
                    `<img src="${product.imageUrl}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Product+Image'">` :
                    `<i class="fas fa-box" style="font-size: 3rem; color: #ccc;"></i>`
                }
            </div>
            <div class="product-info">
                <div class="product-category">${product.category || 'Industrial'}</div>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description || 'Quality industrial product'}</p>
                
                ${product.specifications ? `
                    <div class="product-specs">
                        ${Object.entries(product.specifications).map(([key, value]) => `
                            <div class="spec-item">
                                <span class="spec-label">${key}:</span>
                                <span class="spec-value">${value}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="product-footer">
                    <div>
                        <div class="product-price">₹${product.price.toLocaleString()}</div>
                        <div class="stock-info ${availableStock > 0 ? 'in-stock' : 'out-of-stock'}">
                            <i class="fas ${availableStock > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            ${availableStock > 0 ? `${availableStock} in stock` : 'Out of stock'}
                        </div>
                    </div>
                    <button class="btn btn-primary add-to-cart" 
                            data-id="${product.id}"
                            ${availableStock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                        ${quantityInCart > 0 ? `Added (${quantityInCart})` : 'Add to Cart'}
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }

    // Update cart functions
    function updateCart() {
        // Save to localStorage
        localStorage.setItem('sarm_cart', JSON.stringify(cart));
        
        // Update cart count
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        // Update cart UI
        renderCartItems();
        
        // Update product cards
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            const productId = btn.dataset.id;
            const product = products.find(p => p.id === productId);
            const cartItem = cart.find(item => item.id === productId);
            
            if (product) {
                const availableStock = product.stock - (cartItem ? cartItem.quantity : 0);
                btn.disabled = availableStock === 0;
                btn.innerHTML = `<i class="fas fa-cart-plus"></i> ${cartItem ? `Added (${cartItem.quantity})` : 'Add to Cart'}`;
            }
        });
    }

    function renderCartItems() {
        cartItemsContainer.innerHTML = '';
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                </div>
            `;
            cartTotal.textContent = '₹0';
            checkoutBtn.disabled = true;
            return;
        }
        
        let total = 0;
        
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-image">
                    ${item.imageUrl ? 
                        `<img src="${item.imageUrl}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">` :
                        `<i class="fas fa-box" style="font-size: 2rem; color: #ccc;"></i>`
                    }
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">₹${(item.price * item.quantity).toLocaleString()}</div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn increase" data-id="${item.id}">+</button>
                        <button class="remove-item" data-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            cartItemsContainer.appendChild(cartItem);
            total += item.price * item.quantity;
        });
        
        cartTotal.textContent = `₹${total.toLocaleString()}`;
        checkoutBtn.disabled = false;
    }

    // Event Listeners
    document.addEventListener('click', function(e) {
        // Add to cart
        if (e.target.closest('.add-to-cart')) {
            const btn = e.target.closest('.add-to-cart');
            const productId = btn.dataset.id;
            const product = products.find(p => p.id === productId);
            
            if (product) {
                const cartItem = cart.find(item => item.id === productId);
                
                if (cartItem) {
                    if (cartItem.quantity < product.stock) {
                        cartItem.quantity++;
                    } else {
                        showNotification('Maximum stock reached!', 'warning');
                        return;
                    }
                } else {
                    cart.push({
                        ...product,
                        quantity: 1
                    });
                }
                
                updateCart();
                showNotification(`${product.name} added to cart!`);
            }
        }
        
        // Open cart
        if (e.target.closest('#cart-toggle')) {
            e.preventDefault();
            cartSidebar.classList.add('open');
        }
        
        // Close cart
        if (e.target.closest('.close-cart')) {
            cartSidebar.classList.remove('open');
        }
        
        // Cart quantity controls
        if (e.target.closest('.quantity-btn')) {
            const btn = e.target.closest('.quantity-btn');
            const productId = btn.dataset.id;
            const product = products.find(p => p.id === productId);
            const cartItem = cart.find(item => item.id === productId);
            
            if (cartItem && product) {
                if (btn.classList.contains('increase')) {
                    if (cartItem.quantity < product.stock) {
                        cartItem.quantity++;
                    } else {
                        showNotification('Maximum stock reached!', 'warning');
                    }
                } else if (btn.classList.contains('decrease')) {
                    cartItem.quantity--;
                    if (cartItem.quantity === 0) {
                        cart = cart.filter(item => item.id !== productId);
                    }
                }
                updateCart();
            }
        }
        
        // Remove item from cart
        if (e.target.closest('.remove-item')) {
            const btn = e.target.closest('.remove-item');
            const productId = btn.dataset.id;
            cart = cart.filter(item => item.id !== productId);
            updateCart();
            showNotification('Item removed from cart');
        }
        
        // Checkout button
        if (e.target.closest('#checkout-btn')) {
            if (!currentUser) {
                showNotification('Please login to checkout', 'warning');
                document.querySelector('.close-cart').click();
                loginBtn.click();
                return;
            }
            
            cartSidebar.classList.remove('open');
            openCheckoutModal();
        }
        
        // Login/Register
        if (e.target.closest('#login-btn')) {
            openLoginModal();
        }
        
        if (e.target.closest('#logout-btn')) {
            auth.signOut();
            showNotification('Logged out successfully');
        }
        
        // Close modals
        if (e.target.closest('.close-modal') || e.target === loginModal || e.target === checkoutModal) {
            closeModals();
        }
        
        // Tab switching in login modal
        if (e.target.closest('.tab-btn')) {
            const tabBtn = e.target.closest('.tab-btn');
            const tab = tabBtn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
            
            document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
            document.getElementById(`${tab}-form`).style.display = 'block';
        }
        
        // Filter products
        if (e.target.closest('.filter-btn')) {
            const filterBtn = e.target.closest('.filter-btn');
            const filter = filterBtn.dataset.filter;
            
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            filterBtn.classList.add('active');
            
            if (filter === 'all') {
                displayProducts(products);
            } else {
                const filtered = products.filter(product => 
                    product.category && product.category.toLowerCase() === filter
                );
                displayProducts(filtered);
            }
        }
        
        // Payment method selection
        const paymentRadio = e.target.closest('input[name="payment"]');
        if (paymentRadio) {
            const upiSection = document.getElementById('upi-qr-section');
            if (paymentRadio.value === 'upi') {
                upiSection.style.display = 'block';
            } else {
                upiSection.style.display = 'none';
            }
        }
    });

    // Login/Register functionality
    document.getElementById('login-submit').addEventListener('click', async function() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');
        
        if (!email || !password) {
            errorElement.textContent = 'Please fill in all fields';
            return;
        }
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showNotification('Login successful!');
            closeModals();
        } catch (error) {
            errorElement.textContent = getAuthErrorMessage(error.code);
        }
    });

    document.getElementById('register-submit').addEventListener('click', async function() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        const errorElement = document.getElementById('register-error');
        
        // Validation
        if (!name || !email || !password || !confirmPassword) {
            errorElement.textContent = 'Please fill in all fields';
            return;
        }
        
        if (password !== confirmPassword) {
            errorElement.textContent = 'Passwords do not match';
            return;
        }
        
        if (password.length < 6) {
            errorElement.textContent = 'Password must be at least 6 characters';
            return;
        }
        
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({
                displayName: name
            });
            
            // Create user document in Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                role: 'customer',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                phone: '',
                address: ''
            });
            
            showNotification('Registration successful!');
            closeModals();
        } catch (error) {
            errorElement.textContent = getAuthErrorMessage(error.code);
        }
    });

    // Checkout form submission
    document.getElementById('checkout-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            showNotification('Please login to place order', 'warning');
            return;
        }
        
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'warning');
            return;
        }
        
        const orderData = {
            customerName: document.getElementById('customer-name').value,
            customerPhone: document.getElementById('customer-phone').value,
            customerEmail: document.getElementById('customer-email').value,
            customerAddress: document.getElementById('customer-address').value,
            customerPincode: document.getElementById('customer-pincode').value,
            customerLandmark: document.getElementById('customer-landmark').value,
            paymentMethod: document.querySelector('input[name="payment"]:checked').value,
            specialNotes: document.getElementById('special-notes').value,
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                imageUrl: item.imageUrl
            })),
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            status: 'pending',
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Validate phone number
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(orderData.customerPhone)) {
            showNotification('Please enter a valid 10-digit Indian phone number', 'error');
            return;
        }
        
        // Validate pincode
        if (!/^\d{6}$/.test(orderData.customerPincode)) {
            showNotification('Please enter a valid 6-digit pincode', 'error');
            return;
        }
        
        try {
            // Create order in Firestore
            const orderRef = await db.collection('orders').add(orderData);
            const orderId = orderRef.id;
            
            // Update stock for each product
            for (const item of cart) {
                const productRef = db.collection('products').doc(item.id);
                await productRef.update({
                    stock: firebase.firestore.FieldValue.increment(-item.quantity)
                });
            }
            
            // Generate invoice
            const invoiceUrl = await generateInvoice(orderId, orderData);
            
            // Send WhatsApp notifications
            sendWhatsAppNotifications(orderData, orderId);
            
            // Clear cart
            cart = [];
            updateCart();
            
            // Close modal and show success
            closeModals();
            
            // Redirect to success page
            localStorage.setItem('lastOrderId', orderId);
            window.location.href = 'success.html';
            
        } catch (error) {
            console.error('Order error:', error);
            showNotification('Failed to place order. Please try again.', 'error');
        }
    });

    // Modal functions
    function openLoginModal() {
        loginModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function openCheckoutModal() {
        // Populate checkout items
        const checkoutItems = document.getElementById('checkout-items');
        checkoutItems.innerHTML = '';
        
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'order-item';
            div.innerHTML = `
                <span>${item.name} x${item.quantity}</span>
                <span>₹${(item.price * item.quantity).toLocaleString()}</span>
            `;
            checkoutItems.appendChild(div);
        });
        
        // Update total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('summary-total').textContent = `₹${total.toLocaleString()}`;
        
        // Populate customer info if available
        if (currentUser && currentUser.displayName) {
            document.getElementById('customer-name').value = currentUser.displayName;
            document.getElementById('customer-email').value = currentUser.email;
        }
        
        checkoutModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModals() {
        loginModal.classList.remove('open');
        checkoutModal.classList.remove('open');
        document.body.style.overflow = 'auto';
    }

    // Helper functions
    function getAuthErrorMessage(errorCode) {
        const messages = {
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'Account disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email already registered',
            'auth/weak-password': 'Password is too weak',
            'auth/network-request-failed': 'Network error. Please check your connection'
        };
        return messages[errorCode] || 'An error occurred. Please try again.';
    }

    async function generateInvoice(orderId, orderData) {
        // In a real implementation, this would generate a PDF
        // For now, we'll create a simple invoice in Firestore
        const invoiceData = {
            orderId: orderId,
            invoiceNumber: `INV-${Date.now()}`,
            date: new Date().toISOString(),
            customer: {
                name: orderData.customerName,
                phone: orderData.customerPhone,
                address: orderData.customerAddress,
                pincode: orderData.customerPincode
            },
            items: orderData.items,
            subtotal: orderData.total,
            tax: orderData.total * 0.18,
            total: orderData.total * 1.18,
            paymentMethod: orderData.paymentMethod
        };
        
        await db.collection('invoices').doc(orderId).set(invoiceData);
        return `invoice-${orderId}`;
    }

    function sendWhatsAppNotifications(orderData, orderId) {
        const phone = orderData.customerPhone;
        const adminPhone = '919999999999'; // Replace with actual admin number
        
        // Customer message
        const customerMessage = encodeURIComponent(
            `Thank you for your order from SARM ENTERPRISES!%0A%0A` +
            `Order ID: ${orderId}%0A` +
            `Total Amount: ₹${orderData.total}%0A` +
            `Items: ${orderData.items.map(item => `${item.name} x${item.quantity}`).join(', ')}%0A%0A` +
            `Your order is being processed. We'll contact you shortly.%0A` +
            `For any queries, call: +91-7902312096`
        );
        
        // Admin message
        const adminMessage = encodeURIComponent(
            `📦 NEW ORDER RECEIVED!%0A%0A` +
            `Order ID: ${orderId}%0A` +
            `Customer: ${orderData.customerName}%0A` +
            `Phone: ${orderData.customerPhone}%0A` +
            `Total: ₹${orderData.total}%0A` +
            `Items:%0A${orderData.items.map(item => `  - ${item.name} x${item.quantity} = ₹${item.price * item.quantity}`).join('%0A')}%0A%0A` +
            `Please process this order.`
        );
        
        // Open WhatsApp windows (will only work if user allows popups)
        setTimeout(() => {
            window.open(`https://wa.me/91${phone}?text=${customerMessage}`, '_blank');
            window.open(`https://wa.me/91${adminPhone}?text=${adminMessage}`, '_blank');
        }, 1000);
    }

    // Initialize
    loadProducts();
    updateCart();
    
    // Close cart when clicking outside
    document.addEventListener('click', function(e) {
        if (!cartSidebar.contains(e.target) && !e.target.closest('#cart-toggle') && 
            !e.target.closest('.close-cart') && cartSidebar.classList.contains('open')) {
            cartSidebar.classList.remove('open');
        }
    });

    // Mobile menu toggle
    document.querySelector('.menu-toggle').addEventListener('click', function() {
        document.querySelector('.nav-links').classList.toggle('active');
    });
});
