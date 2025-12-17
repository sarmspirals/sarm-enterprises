// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    let currentAdmin = null;
    let editingProductId = null;
    
    // DOM Elements
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLogoutBtn = document.getElementById('adminLogout');
    const productModal = document.getElementById('productModal');
    const orderModal = document.getElementById('orderModal');
    const addProductBtn = document.getElementById('addProductBtn');
    const refreshDataBtn = document.getElementById('refreshData');
    
    // Check admin authentication
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Check if user is admin
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().role === 'admin') {
                currentAdmin = user;
                adminLogin.style.display = 'none';
                adminDashboard.style.display = 'block';
                loadDashboardData();
            } else {
                showNotification('Access denied. Admin privileges required.', 'error');
                window.location.href = 'index.html';
            }
        } else {
            adminLogin.style.display = 'flex';
            adminDashboard.style.display = 'none';
        }
    });
    
    // Admin login
    adminLoginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const errorElement = document.getElementById('adminLoginError');
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            errorElement.textContent = getAuthErrorMessage(error.code);
        }
    });
    
    // Admin logout
    adminLogoutBtn.addEventListener('click', function() {
        auth.signOut();
        showNotification('Logged out successfully');
    });
    
    // Load dashboard data
    async function loadDashboardData() {
        try {
            // Load statistics
            await loadStatistics();
            
            // Load orders
            await loadOrders();
            
            // Load products
            await loadProducts();
            
            // Load customers
            await loadCustomers();
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showNotification('Error loading dashboard data', 'error');
        }
    }
    
    // Load statistics
    async function loadStatistics() {
        const ordersSnapshot = await db.collection('orders').get();
        const productsSnapshot = await db.collection('products').get();
        
        const orders = [];
        ordersSnapshot.forEach(doc => orders.push(doc.data()));
        
        const products = [];
        productsSnapshot.forEach(doc => products.push(doc.data()));
        
        // Update statistics
        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('pendingOrders').textContent = 
            orders.filter(o => o.status === 'pending').length;
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
        
        const lowStock = products.filter(p => p.stock < 10).length;
        document.getElementById('lowStock').textContent = lowStock;
    }
    
    // Load orders
    async function loadOrders() {
        const ordersTable = document.getElementById('ordersTable');
        ordersTable.innerHTML = '<tr><td colspan="7" class="loading">Loading orders...</td></tr>';
        
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .get();
        
        ordersTable.innerHTML = '';
        
        if (snapshot.empty) {
            ordersTable.innerHTML = '<tr><td colspan="7" class="empty">No orders found</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const row = createOrderRow(doc.id, order);
            ordersTable.appendChild(row);
        });
    }
    
    function createOrderRow(orderId, order) {
        const row = document.createElement('tr');
        
        const statusColors = {
            'pending': 'warning',
            'confirmed': 'info',
            'shipped': 'primary',
            'delivered': 'success',
            'cancelled': 'danger'
        };
        
        const statusIcons = {
            'pending': 'fa-clock',
            'confirmed': 'fa-check-circle',
            'shipped': 'fa-shipping-fast',
            'delivered': 'fa-box-check',
            'cancelled': 'fa-times-circle'
        };
        
        row.innerHTML = `
            <td><strong>${orderId.substring(0, 8)}</strong></td>
            <td>
                <div>${order.customerName}</div>
                <small>${order.customerPhone}</small>
            </td>
            <td>${order.items.length} items</td>
            <td>₹${order.total.toLocaleString()}</td>
            <td>
                <span class="status-badge ${statusColors[order.status] || 'secondary'}">
                    <i class="fas ${statusIcons[order.status] || 'fa-circle'}"></i>
                    ${order.status}
                </span>
            </td>
            <td>${new Date(order.createdAt?.toDate() || new Date()).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon view-order" data-id="${orderId}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <select class="status-select" data-id="${orderId}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
            </td>
        `;
        
        return row;
    }
    
    // Load products
    async function loadProducts() {
        const productsTable = document.getElementById('productsTable');
        productsTable.innerHTML = '<tr><td colspan="6" class="loading">Loading products...</td></tr>';
        
        const snapshot = await db.collection('products').get();
        productsTable.innerHTML = '';
        
        if (snapshot.empty) {
            productsTable.innerHTML = '<tr><td colspan="6" class="empty">No products found</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const row = createProductRow(product);
            productsTable.appendChild(row);
        });
    }
    
    function createProductRow(product) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <div class="product-cell">
                    ${product.imageUrl ? 
                        `<img src="${product.imageUrl}" alt="${product.name}" class="product-thumb">` :
                        `<i class="fas fa-box product-thumb-icon"></i>`
                    }
                    <div>
                        <strong>${product.name}</strong>
                        <small>${product.description?.substring(0, 50)}...</small>
                    </div>
                </div>
            </td>
            <td>
                <span class="category-badge">${product.category || 'Uncategorized'}</span>
            </td>
            <td>₹${product.price.toLocaleString()}</td>
            <td>
                <span class="stock-badge ${product.stock < 10 ? 'low' : 'good'}">
                    ${product.stock}
                </span>
            </td>
            <td>
                <span class="status-badge ${product.stock > 0 ? 'success' : 'danger'}">
                    ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon edit-product" data-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-product" data-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    // Load customers
    async function loadCustomers() {
        const customersTable = document.getElementById('customersTable');
        customersTable.innerHTML = '<tr><td colspan="6" class="loading">Loading customers...</td></tr>';
        
        const usersSnapshot = await db.collection('users')
            .where('role', '==', 'customer')
            .get();
        
        customersTable.innerHTML = '';
        
        if (usersSnapshot.empty) {
            customersTable.innerHTML = '<tr><td colspan="6" class="empty">No customers found</td></tr>';
            return;
        }
        
        // Get orders for each customer
        const ordersSnapshot = await db.collection('orders').get();
        const orders = [];
        ordersSnapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
        
        usersSnapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            const customerOrders = orders.filter(o => o.userId === doc.id);
            const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
            
            const row = createCustomerRow(user, customerOrders.length, totalSpent);
            customersTable.appendChild(row);
        });
    }
    
    function createCustomerRow(user, orderCount, totalSpent) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <div>
                    <strong>${user.name}</strong>
                    <small>ID: ${user.id.substring(0, 8)}</small>
                </div>
            </td>
            <td>${user.email}</td>
            <td>${user.phone || 'Not provided'}</td>
            <td>${orderCount}</td>
            <td>₹${totalSpent.toLocaleString()}</td>
            <td>${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
        `;
        
        return row;
    }
    
    // Event Listeners
    document.addEventListener('click', function(e) {
        // Tab switching
        if (e.target.closest('.admin-tab')) {
            const tabBtn = e.target.closest('.admin-tab');
            const tab = tabBtn.dataset.tab;
            
            document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${tab}Tab`).classList.add('active');
        }
        
        // Add product
        if (e.target.closest('#addProductBtn')) {
            editingProductId = null;
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus"></i> Add New Product';
            document.getElementById('productForm').reset();
            openModal(productModal);
        }
        
        // Edit product
        if (e.target.closest('.edit-product')) {
            const productId = e.target.closest('.edit-product').dataset.id;
            editProduct(productId);
        }
        
        // Delete product
        if (e.target.closest('.delete-product')) {
            const productId = e.target.closest('.delete-product').dataset.id;
            deleteProduct(productId);
        }
        
        // View order
        if (e.target.closest('.view-order')) {
            const orderId = e.target.closest('.view-order').dataset.id;
            viewOrderDetails(orderId);
        }
        
        // Refresh data
        if (e.target.closest('#refreshData')) {
            loadDashboardData();
            showNotification('Data refreshed');
        }
        
        // Close modals
        if (e.target.closest('.close-modal') || e.target === productModal || e.target === orderModal) {
            closeModals();
        }
    });
    
    // Order status change
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('status-select')) {
            const orderId = e.target.dataset.id;
            const newStatus = e.target.value;
            updateOrderStatus(orderId, newStatus);
        }
    });
    
    // Product form submission
    document.getElementById('productForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const productData = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            imageUrl: document.getElementById('productImageUrl').value,
            specifications: getSpecifications(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            if (editingProductId) {
                // Update existing product
                await db.collection('products').doc(editingProductId).update(productData);
                showNotification('Product updated successfully');
            } else {
                // Add new product
                productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('products').add(productData);
                showNotification('Product added successfully');
            }
            
            closeModals();
            loadProducts();
            loadStatistics();
            
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Error saving product', 'error');
        }
    });
    
    // Add specification row
    document.getElementById('addSpec').addEventListener('click', function() {
        const container = document.getElementById('specificationsContainer');
        const div = document.createElement('div');
        div.className = 'spec-row';
        div.innerHTML = `
            <input type="text" class="spec-key" placeholder="Key (e.g., Material)">
            <input type="text" class="spec-value" placeholder="Value (e.g., Steel)">
            <button type="button" class="btn btn-outline remove-spec">-</button>
        `;
        container.appendChild(div);
    });
    
    // Remove specification row
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-spec')) {
            e.target.closest('.spec-row').remove();
        }
    });
    
    // Helper functions
    function getSpecifications() {
        const specs = {};
        document.querySelectorAll('.spec-row').forEach(row => {
            const key = row.querySelector('.spec-key').value.trim();
            const value = row.querySelector('.spec-value').value.trim();
            if (key && value) {
                specs[key] = value;
            }
        });
        return Object.keys(specs).length > 0 ? specs : null;
    }
    
    async function editProduct(productId) {
        try {
            const doc = await db.collection('products').doc(productId).get();
            if (doc.exists) {
                const product = doc.data();
                editingProductId = productId;
                
                // Fill form
                document.getElementById('productName').value = product.name;
                document.getElementById('productCategory').value = product.category || '';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productPrice').value = product.price || 0;
                document.getElementById('productStock').value = product.stock || 0;
                document.getElementById('productImageUrl').value = product.imageUrl || '';
                
                // Clear and fill specifications
                const container = document.getElementById('specificationsContainer');
                container.innerHTML = '';
                
                if (product.specifications) {
                    Object.entries(product.specifications).forEach(([key, value]) => {
                        const div = document.createElement('div');
                        div.className = 'spec-row';
                        div.innerHTML = `
                            <input type="text" class="spec-key" value="${key}">
                            <input type="text" class="spec-value" value="${value}">
                            <button type="button" class="btn btn-outline remove-spec">-</button>
                        `;
                        container.appendChild(div);
                    });
                } else {
                    container.innerHTML = `
                        <div class="spec-row">
                            <input type="text" class="spec-key" placeholder="Key (e.g., Material)">
                            <input type="text" class="spec-value" placeholder="Value (e.g., Steel)">
                            <button type="button" class="btn btn-outline remove-spec">-</button>
                        </div>
                    `;
                }
                
                document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Product';
                openModal(productModal);
            }
        } catch (error) {
            console.error('Error loading product:', error);
            showNotification('Error loading product', 'error');
        }
    }
    
    async function deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            try {
                await db.collection('products').doc(productId).delete();
                showNotification('Product deleted successfully');
                loadProducts();
                loadStatistics();
            } catch (error) {
                console.error('Error deleting product:', error);
                showNotification('Error deleting product', 'error');
            }
        }
    }
    
    async function viewOrderDetails(orderId) {
        try {
            const doc = await db.collection('orders').doc(orderId).get();
            if (doc.exists) {
                const order = doc.data();
                const details = document.getElementById('orderDetails');
                
                details.innerHTML = `
                    <div class="order-details-grid">
                        <div class="order-section">
                            <h3><i class="fas fa-user"></i> Customer Information</h3>
                            <div class="info-group">
                                <label>Name:</label>
                                <span>${order.customerName}</span>
                            </div>
                            <div class="info-group">
                                <label>Phone:</label>
                                <span>${order.customerPhone}</span>
                            </div>
                            <div class="info-group">
                                <label>Email:</label>
                                <span>${order.customerEmail}</span>
                            </div>
                            <div class="info-group">
                                <label>Address:</label>
                                <span>${order.customerAddress}, ${order.customerLandmark} - ${order.customerPincode}</span>
                            </div>
                        </div>
                        
                        <div class="order-section">
                            <h3><i class="fas fa-shopping-cart"></i> Order Information</h3>
                            <div class="info-group">
                                <label>Order ID:</label>
                                <span>${orderId}</span>
                            </div>
                            <div class="info-group">
                                <label>Status:</label>
                                <span class="status-badge ${order.status}">${order.status}</span>
                            </div>
                            <div class="info-group">
                                <label>Payment Method:</label>
                                <span>${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI Payment'}</span>
                            </div>
                            <div class="info-group">
                                <label>Date:</label>
                                <span>${new Date(order.createdAt?.toDate() || new Date()).toLocaleString()}</span>
                            </div>
                            <div class="info-group">
                                <label>Special Notes:</label>
                                <span>${order.specialNotes || 'None'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-items">
                        <h3><i class="fas fa-boxes"></i> Order Items</h3>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Price</th>
                                    <th>Quantity</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>₹${item.price}</td>
                                        <td>${item.quantity}</td>
                                        <td>₹${item.price * item.quantity}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3"><strong>Grand Total</strong></td>
                                    <td><strong>₹${order.total}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <div class="order-actions">
                        <button class="btn btn-primary print-invoice" data-id="${orderId}">
                            <i class="fas fa-print"></i> Print Invoice
                        </button>
                        <button class="btn btn-outline send-whatsapp" data-phone="${order.customerPhone}" data-id="${orderId}">
                            <i class="fab fa-whatsapp"></i> WhatsApp Customer
                        </button>
                    </div>
                `;
                
                openModal(orderModal);
            }
        } catch (error) {
            console.error('Error loading order:', error);
            showNotification('Error loading order details', 'error');
        }
    }
    
    async function updateOrderStatus(orderId, status) {
        try {
            await db.collection('orders').doc(orderId).update({
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification(`Order status updated to ${status}`);
            loadOrders();
            loadStatistics();
            
            // Send WhatsApp notification if shipped or delivered
            if (status === 'shipped' || status === 'delivered') {
                const orderDoc = await db.collection('orders').doc(orderId).get();
                if (orderDoc.exists) {
                    const order = orderDoc.data();
                    const message = encodeURIComponent(
                        `Your order ${orderId} has been ${status}.%0A%0A` +
                        `Status: ${status}%0A` +
                        `Total: ₹${order.total}%0A` +
                        `Thank you for shopping with SARM ENTERPRISES!`
                    );
                    
                    window.open(`https://wa.me/91${order.customerPhone}?text=${message}`, '_blank');
                }
            }
            
        } catch (error) {
            console.error('Error updating order:', error);
            showNotification('Error updating order status', 'error');
        }
    }
    
    function openModal(modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    
    function closeModals() {
        document.querySelectorAll('.modal.open').forEach(modal => {
            modal.classList.remove('open');
        });
        document.body.style.overflow = 'auto';
    }
    
    // Add admin-specific CSS
    const adminStyles = `
    .admin-body {
        background: #f5f5f5;
        min-height: 100vh;
    }
    
    .admin-container {
        max-width: 1400px;
        margin: 0 auto;
    }
    
    .admin-login {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
    }
    
    .login-box {
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        width: 100%;
        max-width: 400px;
    }
    
    .login-header {
        text-align: center;
        margin-bottom: 30px;
    }
    
    .login-header i {
        font-size: 3rem;
        color: var(--primary);
        margin-bottom: 15px;
    }
    
    .login-header h2 {
        margin-bottom: 5px;
    }
    
    .login-header p {
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    .login-footer {
        text-align: center;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--light-gray);
    }
    
    .login-footer a {
        color: var(--primary);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }
    
    .admin-header {
        background: white;
        padding: 20px;
        border-radius: 12px;
        margin: 20px;
        box-shadow: var(--shadow);
    }
    
    .admin-header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .admin-brand {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .admin-brand i {
        font-size: 2.5rem;
        color: var(--primary);
    }
    
    .admin-brand h1 {
        font-size: 1.5rem;
        margin-bottom: 5px;
    }
    
    .admin-brand p {
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    .admin-actions {
        display: flex;
        gap: 10px;
    }
    
    .admin-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }
    
    .stat-card {
        background: var(--light);
        padding: 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .stat-card i {
        font-size: 2rem;
        color: var(--primary);
    }
    
    .stat-card h3 {
        font-size: 1.8rem;
        margin-bottom: 5px;
    }
    
    .stat-card p {
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    .admin-main {
        background: white;
        margin: 20px;
        border-radius: 12px;
        box-shadow: var(--shadow);
        overflow: hidden;
    }
    
    .admin-tabs {
        display: flex;
        background: var(--light);
        border-bottom: 1px solid var(--light-gray);
    }
    
    .admin-tab {
        flex: 1;
        padding: 15px 20px;
        background: none;
        border: none;
        font-size: 1rem;
        font-weight: 500;
        color: var(--gray);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: var(--transition);
    }
    
    .admin-tab.active {
        background: white;
        color: var(--primary);
        border-bottom: 3px solid var(--primary);
    }
    
    .tab-content {
        display: none;
        padding: 20px;
    }
    
    .tab-content.active {
        display: block;
    }
    
    .tab-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .tab-header h2 {
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .tab-filters {
        display: flex;
        gap: 10px;
    }
    
    .search-box {
        position: relative;
        width: 300px;
    }
    
    .search-box i {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--gray);
    }
    
    .search-box input {
        width: 100%;
        padding: 10px 10px 10px 35px;
        border: 1px solid var(--light-gray);
        border-radius: var(--radius);
    }
    
    .table-container {
        overflow-x: auto;
    }
    
    .admin-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .admin-table th {
        background: var(--light);
        padding: 12px 15px;
        text-align: left;
        font-weight: 600;
        color: var(--dark);
        border-bottom: 2px solid var(--light-gray);
    }
    
    .admin-table td {
        padding: 12px 15px;
        border-bottom: 1px solid var(--light-gray);
        vertical-align: middle;
    }
    
    .admin-table tr:hover {
        background: #f9f9f9;
    }
    
    .product-cell {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .product-thumb {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 4px;
    }
    
    .product-thumb-icon {
        width: 50px;
        height: 50px;
        background: var(--light);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: var(--gray);
    }
    
    .category-badge {
        background: #e3f2fd;
        color: var(--primary);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .stock-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 0.9rem;
        min-width: 40px;
        text-align: center;
    }
    
    .stock-badge.good {
        background: #d4edda;
        color: #155724;
    }
    
    .stock-badge.low {
        background: #fff3cd;
        color: #856404;
    }
    
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 500;
    }
    
    .status-badge.warning {
        background: #fff3cd;
        color: #856404;
    }
    
    .status-badge.success {
        background: #d4edda;
        color: #155724;
    }
    
    .status-badge.danger {
        background: #f8d7da;
        color: #721c24;
    }
    
    .status-badge.info {
        background: #d1ecf1;
        color: #0c5460;
    }
    
    .status-badge.primary {
        background: #cce5ff;
        color: #004085;
    }
    
    .action-buttons {
        display: flex;
        gap: 5px;
        align-items: center;
    }
    
    .btn-icon {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        border: 1px solid var(--light-gray);
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .btn-icon:hover {
        background: var(--light);
    }
    
    .status-select {
        padding: 6px 10px;
        border: 1px solid var(--light-gray);
        border-radius: 4px;
        background: white;
        font-size: 0.85rem;
    }
    
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid var(--light-gray);
    }
    
    .spec-row {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        align-items: center;
    }
    
    .spec-row input {
        flex: 1;
    }
    
    .order-details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-bottom: 30px;
    }
    
    .order-section {
        background: var(--light);
        padding: 20px;
        border-radius: 8px;
    }
    
    .order-section h3 {
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .info-group {
        margin-bottom: 10px;
        display: flex;
    }
    
    .info-group label {
        font-weight: 600;
        min-width: 120px;
        color: var(--gray);
    }
    
    .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
    }
    
    .items-table th,
    .items-table td {
        padding: 10px;
        border: 1px solid var(--light-gray);
        text-align: left;
    }
    
    .items-table th {
        background: var(--light);
    }
    
    .order-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--light-gray);
    }
    
    .loading, .empty {
        text-align: center;
        padding: 40px;
        color: var(--gray);
    }
    
    @media (max-width: 768px) {
        .admin-header-content {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
        }
        
        .admin-tabs {
            flex-direction: column;
        }
        
        .order-details-grid {
            grid-template-columns: 1fr;
        }
        
        .tab-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
        }
        
        .search-box {
            width: 100%;
        }
    }
    `;
    
    const adminStyleSheet = document.createElement('style');
    adminStyleSheet.textContent = adminStyles;
    document.head.appendChild(adminStyleSheet);
});
