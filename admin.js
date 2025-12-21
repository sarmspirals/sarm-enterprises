// Admin JavaScript
let currentTab = 'orders';
let currentOrderId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    setupAdminEventListeners();
    loadOrders();
});

// Admin Authentication
function checkAdminAuth() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            // Check if user is admin (you should implement proper admin check)
            loadAdminData();
        }
    });
}

// Setup Event Listeners
function setupAdminEventListeners() {
    // Tab switching
    document.querySelectorAll('.admin-sidebar a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Order status filter
    document.getElementById('order-status-filter')?.addEventListener('change', (e) => {
        loadOrders(e.target.value);
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        auth.signOut();
        window.location.href = 'index.html';
    });
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').style.display = 'none';
        });
    });
    
    // Add product form
    document.getElementById('add-product-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addNewProduct(e.target);
    });
}

// Tab Switching
function switchTab(tabName) {
    // Update active tab in sidebar
    document.querySelectorAll('.admin-sidebar a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tabName) {
            link.classList.add('active');
        }
    });
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
    
    // Load data for the tab
    switch(tabName) {
        case 'orders':
            loadOrders();
            break;
        case 'products':
            loadAdminProducts();
            break;
        case 'stock':
            loadStock();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Load Orders
async function loadOrders(status = 'all') {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;
    
    ordersContainer.innerHTML = '<p>Loading orders...</p>';
    
    try {
        let query = db.collection('orders').orderBy('timestamp', 'desc');
        
        if (status !== 'all') {
            query = query.where('status', '==', status);
        }
        
        const snapshot = await query.limit(50).get();
        
        if (snapshot.empty) {
            ordersContainer.innerHTML = '<p>No orders found.</p>';
            return;
        }
        
        ordersContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const order = { id: doc.id, ...doc.data() };
            const orderElement = createOrderElement(order);
            ordersContainer.appendChild(orderElement);
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersContainer.innerHTML = '<p>Error loading orders.</p>';
    }
}

function createOrderElement(order) {
    const div = document.createElement('div');
    div.className = `order-item ${order.status}`;
    div.innerHTML = `
        <div class="order-header">
            <span class="order-id">Order #${order.id.substring(0, 8)}</span>
            <span class="order-status ${order.status}">${order.status}</span>
            <span class="order-total">₹${order.total}</span>
        </div>
        <div class="order-details">
            <p><strong>Customer:</strong> ${order.customer.name}</p>
            <p><strong>Phone:</strong> ${order.customer.phone}</p>
            <p><strong>Date:</strong> ${order.timestamp?.toDate().toLocaleDateString()}</p>
            <p><strong>Items:</strong> ${order.items.length} items</p>
        </div>
        <div class="order-actions">
            <button onclick="viewOrderDetails('${order.id}')">View Details</button>
            <button onclick="updateOrderStatusPrompt('${order.id}', '${order.status}')">Update Status</button>
        </div>
    `;
    return div;
}

// View Order Details
async function viewOrderDetails(orderId) {
    try {
        const doc = await db.collection('orders').doc(orderId).get();
        if (!doc.exists) return;
        
        const order = { id: doc.id, ...doc.data() };
        currentOrderId = orderId;
        
        const modal = document.getElementById('order-details-modal');
        const content = document.getElementById('order-details-content');
        
        let itemsHtml = '<h3>Items:</h3><ul>';
        order.items.forEach(item => {
            itemsHtml += `<li>${item.name} × ${item.quantity} = ₹${item.price * item.quantity}</li>`;
        });
        itemsHtml += '</ul>';
        
        content.innerHTML = `
            <div class="order-detail-section">
                <h3>Order Information</h3>
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Date:</strong> ${order.timestamp?.toDate().toLocaleString()}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            </div>
            
            <div class="order-detail-section">
                <h3>Customer Information</h3>
                <p><strong>Name:</strong> ${order.customer.name}</p>
                <p><strong>Phone:</strong> ${order.customer.phone}</p>
                <p><strong>Address:</strong> ${order.customer.address}</p>
                <p><strong>Pincode:</strong> ${order.customer.pincode}</p>
                <p><strong>Landmark:</strong> ${order.customer.landmark}</p>
            </div>
            
            ${itemsHtml}
            
            <div class="order-detail-section">
                <h3>Payment Summary</h3>
                <p><strong>Subtotal:</strong> ₹${order.subtotal}</p>
                <p><strong>Delivery:</strong> ₹${order.delivery}</p>
                <p><strong>Total:</strong> ₹${order.total}</p>
            </div>
        `;
        
        // Set current status in select
        document.getElementById('order-status-select').value = order.status;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading order details:', error);
    }
}

// Update Order Status
async function updateOrderStatus() {
    if (!currentOrderId) return;
    
    const newStatus = document.getElementById('order-status-select').value;
    
    try {
        await db.collection('orders').doc(currentOrderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Order status updated successfully!');
        loadOrders();
        document.getElementById('order-details-modal').style.display = 'none';
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error updating order status');
    }
}

// Send WhatsApp Update
async function sendOrderUpdate() {
    if (!currentOrderId) return;
    
    try {
        const doc = await db.collection('orders').doc(currentOrderId).get();
        if (!doc.exists) return;
        
        const order = doc.data();
        const newStatus = document.getElementById('order-status-select').value;
        
        const message = `Your order #${currentOrderId.substring(0, 8)} status has been updated to: ${newStatus}\n` +
                       `SARM ENTERPRISES\n` +
                       `Thank you for your business!`;
        
        window.open(`https://wa.me/${order.customer.phone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
        console.error('Error sending WhatsApp update:', error);
    }
}

// Load Products for Admin
async function loadAdminProducts() {
    const container = document.getElementById('admin-products-container');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('products').get();
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const productElement = createAdminProductElement(product);
            container.appendChild(productElement);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function createAdminProductElement(product) {
    const div = document.createElement('div');
    div.className = 'admin-product-item';
    div.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
            <h4>${product.name}</h4>
            <p>Price: ₹${product.price}</p>
            <p>Stock: ${product.stock}</p>
            <p>Category: ${product.category}</p>
        </div>
        <div class="product-actions">
            <button onclick="editProduct('${product.id}')">Edit</button>
            <button onclick="deleteProduct('${product.id}')">Delete</button>
            <button onclick="updateStockPrompt('${product.id}', '${product.name}', ${product.stock})">Update Stock</button>
        </div>
    `;
    return div;
}

// Add New Product
async function addNewProduct(form) {
    const productData = {
        name: form[0].value,
        price: parseFloat(form[1].value),
        stock: parseInt(form[2].value),
        category: form[3].value,
        image: form[4].value,
        description: form[5].value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('products').add(productData);
        alert('Product added successfully!');
        form.reset();
        document.getElementById('add-product-modal').style.display = 'none';
        loadAdminProducts();
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Error adding product');
    }
}

// Update Stock
async function updateStock(productId, newStock) {
    try {
        await db.collection('products').doc(productId).update({
            stock: newStock
        });
        alert('Stock updated successfully!');
        loadAdminProducts();
        loadStock();
    } catch (error) {
        console.error('Error updating stock:', error);
        alert('Error updating stock');
    }
}

// Load Stock
async function loadStock() {
    const container = document.getElementById('stock-container');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('products').orderBy('category').get();
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const stockElement = createStockElement(product);
            container.appendChild(stockElement);
        });
    } catch (error) {
        console.error('Error loading stock:', error);
    }
}

function createStockElement(product) {
    const div = document.createElement('div');
    div.className = 'stock-item';
    const stockClass = product.stock <= 10 ? 'low' : product.stock <= 50 ? 'medium' : 'high';
    div.innerHTML = `
        <span class="product-name">${product.name}</span>
        <span class="stock-level ${stockClass}">${product.stock} units</span>
        <div class="stock-actions">
            <button onclick="updateStockPrompt('${product.id}', '${product.name}', ${product.stock})">Update</button>
        </div>
    `;
    return div;
}

// Load Customers
async function loadCustomers() {
    const container = document.getElementById('customers-container');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('users').get();
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<p>No customers found.</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const customer = { id: doc.id, ...doc.data() };
            const customerElement = createCustomerElement(customer);
            container.appendChild(customerElement);
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function createCustomerElement(customer) {
    const div = document.createElement('div');
    div.className = 'customer-item';
    div.innerHTML = `
        <div class="customer-info">
            <h4>${customer.name}</h4>
            <p>Email: ${customer.email}</p>
            <p>Phone: ${customer.phone}</p>
            <p>Joined: ${customer.createdAt?.toDate().toLocaleDateString()}</p>
        </div>
        <div class="customer-actions">
            <button onclick="viewCustomerOrders('${customer.id}')">View Orders</button>
            <button onclick="contactCustomer('${customer.phone}')">Contact</button>
        </div>
    `;
    return div;
}

// Load Settings
function loadSettings() {
    // This could load settings from Firestore
    console.log('Loading settings...');
}

function saveSettings() {
    // Save settings to Firestore
    alert('Settings saved!');
}

// Utility Functions
function openAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'block';
}

function updateStockPrompt(productId, productName, currentStock) {
    const newStock = prompt(`Update stock for ${productName}\nCurrent stock: ${currentStock}\nEnter new stock:`, currentStock);
    if (newStock !== null && !isNaN(newStock)) {
        updateStock(productId, parseInt(newStock));
    }
}

function updateOrderStatusPrompt(orderId, currentStatus) {
    currentOrderId = orderId;
    document.getElementById('order-status-select').value = currentStatus;
    viewOrderDetails(orderId);
}

function contactCustomer(phone) {
    window.open(`https://wa.me/${phone}`, '_blank');
}

// Export functions to global scope
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.sendOrderUpdate = sendOrderUpdate;
window.openAddProductModal = openAddProductModal;
window.updateStockPrompt = updateStockPrompt;
window.updateOrderStatusPrompt = updateOrderStatusPrompt;
window.contactCustomer = contactCustomer;
