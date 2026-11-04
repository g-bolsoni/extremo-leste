import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import { whenAuthReady, isAdminNow } from './composables/useStore'

// A build de prévia (VITE_ROUTER=memory) não mexe na URL da página que a hospeda.
const history = import.meta.env.VITE_ROUTER === 'memory' ? createMemoryHistory() : createWebHistory()

// meta.admin: rota só para administradores (visitante volta para a home).
const router = createRouter({
  history,
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: 'Jogos' } },
    { path: '/admin', name: 'admin', component: () => import('./views/LoginView.vue'), meta: { title: 'Admin', back: '/' } },
    { path: '/jogo/novo', name: 'match-new', component: () => import('./views/MatchFormView.vue'), meta: { title: 'Novo jogo', back: '/', admin: true } },
    { path: '/jogo/:id', name: 'match', component: () => import('./views/MatchDetailView.vue'), props: true, meta: { title: 'Jogo', back: '/' } },
    { path: '/jogo/:id/editar', name: 'match-edit', component: () => import('./views/MatchFormView.vue'), props: true, meta: { title: 'Editar jogo', back: true, admin: true } },
    { path: '/campeonatos', name: 'championships', component: () => import('./views/ChampionshipsView.vue'), meta: { title: 'Campeonatos' } },
    { path: '/campeonato/novo', name: 'championship-new', component: () => import('./views/ChampionshipFormView.vue'), meta: { title: 'Novo campeonato', back: '/campeonatos', admin: true } },
    { path: '/campeonato/:id', name: 'championship', component: () => import('./views/ChampionshipDetailView.vue'), props: true, meta: { title: 'Campeonato', back: '/campeonatos' } },
    { path: '/campeonato/:id/editar', name: 'championship-edit', component: () => import('./views/ChampionshipFormView.vue'), props: true, meta: { title: 'Editar campeonato', back: true, admin: true } },
    { path: '/patrocinadores', name: 'sponsors', component: () => import('./views/SponsorsView.vue'), meta: { title: 'Patrocinadores', back: '/' } },
    { path: '/patrocinador/novo', name: 'sponsor-new', component: () => import('./views/SponsorFormView.vue'), meta: { title: 'Novo patrocinador', back: '/patrocinadores', admin: true } },
    { path: '/patrocinador/:id/editar', name: 'sponsor-edit', component: () => import('./views/SponsorFormView.vue'), props: true, meta: { title: 'Patrocinador', back: '/patrocinadores', admin: true } },
    { path: '/financeiro', name: 'finance', component: () => import('./views/FinanceView.vue'), meta: { title: 'Financeiro', admin: true } },
    { path: '/jogadores', name: 'players', component: () => import('./views/PlayersView.vue'), meta: { title: 'Jogadores' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  if (!to.matched.some((r) => r.meta.admin)) return true
  await whenAuthReady()
  return isAdminNow() ? true : { name: 'home' }
})

export default router
