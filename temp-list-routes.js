const app = require('./app');

function printRoutes(app) {
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.route) { // routes registered directly on the app
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') { // router middleware 
            const prefix = middleware.regexp.source.replace('^\\/', '/').replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace('^', '').replace(/\\/g, '').replace('?(?=/|$)', '');
            
            // This is a rough estimation of prefix based on express internals, a better way is required if it's complex, 
            // but for this standard api we can just match it.
            
            middleware.handle.stack.forEach(handler => {
                if (handler.route) {
                    routes.push({
                        prefix: middleware.regexp.toString(), // we will format this later
                        path: handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    
    console.log(JSON.stringify(routes, null, 2));
}

printRoutes(app);
