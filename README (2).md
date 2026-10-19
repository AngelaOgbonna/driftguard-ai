# DriftGuard AI

Model reliability and drift detection in the browser. Upload a reference dataset and a new dataset to:

- detect feature drift (KS, chi-square, PSI, Wasserstein, Benjamini–Hochberg correction) and multivariate drift (domain classifier)
- compare prediction distributions and model performance (bootstrap intervals; confidence-based estimate when labels are missing)
- stress-test the model under simulated shifts (noise, mean/scale shift, missing values, category corruption, subpopulation, label prior shift)
- get a Stable / Monitor / Investigate / Retrain recommendation with the reasons behind it

It also has 3D views (a drift terrain on the sign-in page, a PCA data cloud, and a PSI skyline), plus light and dark themes. All analysis runs client-side, so uploaded data never leaves the browser.

## Deploy to Vercel

The site is static: `index.html` is the whole app, and there is no build step on Vercel.

**Option A: GitHub (recommended)**
1. Push this folder to a GitHub repository.
2. In Vercel, select **Add New → Project**, import the repo, keep Framework Preset = **Other**, and leave Build Command and Output Directory empty.
3. Select **Deploy**.

**Option B: CLI**
```bash
npm i -g vercel
vercel        # first run links the project
vercel --prod
```

## Turn on sign-in (optional)

Without keys, the sign-in page offers guest access with sample data only. To enable real accounts with email/password and Google:

1. Create a free project at https://supabase.com.
2. In **Project Settings → API**, copy the Project URL and the `anon` public key. The anon key is designed to be public, so it is safe in client code.
3. Paste both into `window.DRIFTGUARD_CONFIG` in `src/shell.html`, then run `python3 build.py`. You can also edit `index.html` directly.
4. In **Authentication → URL Configuration**, add your Vercel URL (for example `https://driftguard.vercel.app`) as the Site URL and as a Redirect URL.
5. For Google sign-in, enable the Google provider under **Authentication → Providers** and add your Google OAuth client ID and secret.

## Editing

Source lives in `src/`:

- `shell.html`: markup and styles
- `engine.js`: statistics, models and analysis
- `app.js`: auth, navigation, theme and 3D

After editing, run `python3 build.py` to regenerate `index.html`.
