// Function to filter products by category on the main website
function filterProductsByCategory(category) {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        const productCategory = card.getAttribute('data-category');
        
        if (category === 'all' || productCategory === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Function to create category filter on main website
function createCategoryFilter() {
    // Get unique categories from products
    const products = document.querySelectorAll('.product-card');
    const categories = new Set();
    
    products.forEach(product => {
        const category = product.getAttribute('data-category');
        if (category) {
            categories.add(category);
        }
    });
    
    // Create filter buttons
    const filterContainer = document.getElementById('categoryFilter');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = `
        <button class="category-btn active" data-category="all">All Products</button>
    `;
    
    categories.forEach(category => {
        const formattedCategory = category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.textContent = formattedCategory;
        button.setAttribute('data-category', category);
        button.onclick = function() {
            // Remove active class from all buttons
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter products
            filterProductsByCategory(category);
        };
        
        filterContainer.appendChild(button);
    });
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', function() {
    createCategoryFilter();
});
