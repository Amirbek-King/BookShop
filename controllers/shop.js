const fs = require('fs');
const path = require('path');
const pdfkit = require('pdfkit')
const Product = require('../models/product');
const Order = require('../models/order');
const PDFDocument = require("pdfkit");

exports.getProducts = (req, res, next) => {
    Product.find()
        .then(products => {
            console.log(products);
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'All Products',
                path: '/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', {
                product: product,
                pageTitle: product.title,
                path: '/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getIndex = (req, res, next) => {
    Product.find()
        .then(products => {
            res.render('shop/index', {
                prods: products,
                pageTitle: 'Shop',
                path: '/'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items;
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            console.log(result);
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postOrder = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                return next(new Error('No order found.'));
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                return next(new Error('Unauthorized'));
            }

            const invoiceName = 'invoice-' + orderId + '.pdf';
            const invoicePath = path.join('data', 'invoices', invoiceName);

            // The following commented-out code generates and streams a PDF directly
            // const pdfDoc = new PDFDocument()
            // pdfDoc.pipe(fs.createWriteStream(invoicePath))
            // pdfDoc.pipe(res)
            // pdfDoc.fontSize(26).text('Invoice',{
            //     underline:true
            // });
            // let totalPrice = 0;
            // pdfDoc.text('-------------------------------------')
            //         order.products.forEach(prod =>{
            //             totalPrice = totalPrice + (prod.quantity * prod.product.price); // Fixed totalPrice calculation
            //             pdfDoc.fontSize(14).text(
            //                 prod.product.title +
            //                 ' - ' + prod.quantity
            //                 + ' x ' + '$' + prod.product.price
            //             )
            //         })
            // pdfDoc.text("Total price: $" + totalPrice.toFixed(2)) // Total price formatting

            // pdfDoc.end()

            // Calls the pdf_d function to generate and send the PDF
            pdf_d(order, invoicePath, res);

            // Read and stream the invoice file if it already exists
            const file = fs.createReadStream(invoicePath);
            file.on('error', (err) => {
                next(err); // Handle errors like file not found
            });

            // Set headers for PDF response
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);

            // Pipe the file stream to the response
            file.pipe(res);
        })
        .catch(err => next(err));
};

function pdf_d(order, invoicePath, res) {
    const pdfDoc = new PDFDocument();
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(26).text('Invoice', {
        underline: true,
        align: 'center'
    });
    pdfDoc.moveDown();
    pdfDoc.fontSize(14).text(`Order ID: ${order._id}`, {
        align: 'left'
    });
    pdfDoc.text(`Customer: ${order.user.name}`);
    pdfDoc.text(`Order Date: ${new Date().toLocaleDateString()}`);
    pdfDoc.moveDown();

    pdfDoc.text('---------------------------------------------');
    pdfDoc.fontSize(16).text('Products:', { underline: true });
    pdfDoc.moveDown(); // Add some space

    let totalPrice = 0;
    order.products.forEach(prod => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc.fontSize(14).text(
            `${prod.product.title} - ${prod.quantity} x $${prod.product.price.toFixed(2)}`,
            { align: 'left' }
        );
    });
    pdfDoc.moveDown();
    pdfDoc.text('---------------------------------------------');
    pdfDoc.fontSize(18).text('Total Price: $' + totalPrice.toFixed(2), {
        align: 'right',
        bold: true
    });
    pdfDoc.end();
}
