# TyreManager — Guide de démarrage

## 1. Configurer la base de données (Supabase)

1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Aller dans **Project Settings > Database > Connection string > URI**
4. Copier l'URL et la coller dans `.env` :

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXTAUTH_SECRET="changez-ce-secret-en-production"
NEXTAUTH_URL="http://localhost:3000"
```

## 2. Créer les tables

```bash
cd tyre-app
npx prisma db push
```

## 3. Créer les données de test

```bash
npm run db:seed
```

Comptes créés :
| Rôle | Email | Code |
|------|-------|------|
| Super Admin | admin@tyremanager.ma | admin123 |
| Agent client | agent@transportatlas.ma | client123 |
| N+1 client | responsable@transportatlas.ma | n1pass123 |
| Agent commercial | commercial@fournisseur.ma | comm123 |
| Service achat | achat@fournisseur.ma | achat123 |

## 4. Lancer l'application

```bash
npm run dev
```

Ouvrir http://localhost:3000

## Déploiement sur Vercel

1. Pousser le code sur GitHub
2. Connecter le repo à Vercel
3. Ajouter les variables d'environnement dans Vercel
4. Déployer
