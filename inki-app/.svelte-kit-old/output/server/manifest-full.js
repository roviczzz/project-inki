export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","svelte.svg","tauri.svg","vite.svg"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.C9DUhowl.js",app:"_app/immutable/entry/app.oDkcve5c.js",imports:["_app/immutable/entry/start.C9DUhowl.js","_app/immutable/chunks/CxZg9BM_.js","_app/immutable/chunks/BSUjZ0uE.js","_app/immutable/chunks/DGOPAheC.js","_app/immutable/entry/app.oDkcve5c.js","_app/immutable/chunks/BSUjZ0uE.js","_app/immutable/chunks/BRRew5W5.js","_app/immutable/chunks/6zrriF_p.js","_app/immutable/chunks/DGOPAheC.js","_app/immutable/chunks/Bn64zmTd.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
