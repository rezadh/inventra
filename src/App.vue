<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  Boxes,
  LayoutDashboard,
  Package,
  Shapes,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Settings2,
  PanelLeftClose,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  Bell,
  CircleHelp,
} from 'lucide-vue-next';
import { state, load } from './store';
const route = useRoute();
const mobile = ref(false);
const links = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'barang', label: 'Manajemen Barang', icon: Package },
  { path: 'kategori', label: 'Kategori', icon: Shapes },
  { path: 'transaksi', label: 'Transaksi Stok', icon: ArrowLeftRight },
  { path: 'laporan', label: 'Laporan', icon: ChartNoAxesCombined },
];
onMounted(load);
</script>
<template>
  <a class="skip-link" href="#main-content">Lewati ke konten utama</a>
  <div class="app-shell">
    <button
      v-if="mobile"
      class="sidebar-scrim"
      aria-label="Tutup navigasi"
      @click="mobile = false"
    ></button>
    <aside class="sidebar" :class="{ open: mobile }">
      <RouterLink to="/dashboard" class="brand" @click="mobile = false"
        ><span class="brand-mark"><Boxes :size="25" /></span
        ><span>inventra<span class="brand-dot">.</span></span></RouterLink
      >
      <button class="mobile-close icon-button" aria-label="Tutup navigasi" @click="mobile = false">
        <X :size="20" />
      </button>
      <div class="workspace-card">
        <span class="workspace-avatar">N</span
        ><span><strong>Nusantara Supply</strong><small>Demo workspace</small></span
        ><ChevronDown :size="15" />
      </div>
      <p class="nav-label">WORKSPACE</p>
      <nav aria-label="Navigasi utama">
        <RouterLink
          v-for="item in links"
          :key="item.path"
          :to="'/' + item.path"
          @click="mobile = false"
          ><component :is="item.icon" :size="19" /><span>{{ item.label }}</span
          ><span v-if="item.path === 'barang'" class="nav-count">{{
            state.data.products.filter((p) => !p.archived).length
          }}</span></RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="demo-card">
          <span class="demo-card-icon"><ShieldCheck :size="19" /></span
          ><strong>Ruang eksplorasi Anda</strong>
          <p>Coba semua fitur dengan data contoh. Bebas bereksperimen.</p>
          <RouterLink to="/pengaturan" @click="mobile = false"
            >Kelola data demo <ArrowUpRight :size="15"
          /></RouterLink>
        </div>
        <RouterLink class="settings-link" to="/pengaturan" @click="mobile = false"
          ><Settings2 :size="19" />Pengaturan</RouterLink
        >
        <div class="sidebar-foot">
          <span class="online-dot"></span> Penyimpanan lokal <span>v1.0</span>
        </div>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="breadcrumb">
          <button
            class="icon-button desktop-collapse"
            aria-label="Buka atau tutup navigasi mobile"
            @click="mobile = !mobile"
          >
            <Menu :size="20" /></button
          ><span>Workspace</span><span class="breadcrumb-separator">/</span
          ><strong>{{
            route.path === '/pengaturan'
              ? 'Pengaturan'
              : links.find((x) => '/' + x.path === route.path)?.label
          }}</strong>
        </div>
        <div class="topbar-right">
          <span class="demo-pill"><span></span> Live demo</span
          ><RouterLink to="/pengaturan" class="icon-button help-button" aria-label="Informasi demo"
            ><CircleHelp :size="19"
          /></RouterLink>
          <div class="avatar" title="Workspace demo tanpa autentikasi">NS</div>
        </div>
      </header>
      <main id="main-content">
        <div v-if="state.loading" class="load-state" role="status">
          <span class="spinner"></span>Menyiapkan workspace Anda…
        </div>
        <div v-else-if="state.error" class="error-state" role="alert">
          <h2>Data belum dapat dimuat</h2>
          <p>{{ state.error }}</p>
          <button class="button primary" @click="load">Coba lagi</button>
        </div>
        <RouterView v-else />
      </main>
      <footer class="main-footer">
        <span
          >© {{ new Date().getFullYear() }} INVENTRA <span class="footer-divider">/</span> Built for
          better inventory.</span
        ><span
          ><span class="online-dot"></span> Data tersimpan di browser ini · Bukan sistem
          multiuser</span
        >
      </footer>
    </div>
    <Transition name="toast"
      ><div v-if="state.toast" class="toast" role="status">
        <ShieldCheck :size="19" />{{ state.toast
        }}<button class="icon-button" aria-label="Tutup notifikasi" @click="state.toast = ''">
          <X :size="16" />
        </button></div
    ></Transition>
  </div>
</template>
