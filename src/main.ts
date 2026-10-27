import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import Workspace from './components/Workspace.vue';
import './style.css';
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    ...['dashboard', 'barang', 'kategori', 'transaksi', 'laporan', 'pengaturan'].map((page) => ({
      path: `/${page}`,
      component: Workspace,
      props: { page },
    })),
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
});
createApp(App).use(router).mount('#app');
