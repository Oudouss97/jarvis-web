// Configuration Supabase
const SUPABASE_URL = 'https://drgbsrfwepqwletfstaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1PdFR-tSzvnLNiP16p3hFg_douwIesc';

console.log("🚀 auth.js : Script chargé");

// On utilise window.supabase car le SDK est chargé via CDN
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("📦 auth.js : DOM chargé");
    const authForm = document.getElementById('auth-form');
    const registerForm = document.getElementById('register-form');
    const btnAuth = document.getElementById('btn-auth');
    const btnRegister = document.getElementById('btn-register');

    // --- LOGIQUE DE CONNEXION (LOGIN) ---
    if (authForm) {
        console.log("✅ Formulaire Login trouvé");
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Tentative de connexion...");
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) return alert('Veuillez remplir tous les champs');

            btnAuth.disabled = true;
            btnAuth.textContent = 'Connexion...';

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;

                console.log("✅ Connexion réussie, redirection...");
                // On force un court délai pour laisser Supabase enregistrer la session dans le localStorage
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
            } catch (error) {
                alert('Erreur de connexion : ' + error.message);
            } finally {
                btnAuth.disabled = false;
                btnAuth.textContent = 'Se connecter';
            }
        });
    }

    // --- LOGIQUE D'INSCRIPTION (REGISTER) ---
    if (registerForm) {
        console.log("✅ Formulaire Inscription trouvé");
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Tentative d'inscription...");
            const fullName = document.getElementById('full_name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!fullName || !email || !password) return alert('Veuillez remplir tous les champs');

            btnRegister.disabled = true;
            btnRegister.textContent = 'Création...';

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });

                if (error) throw error;

                alert('Compte créé avec succès ! \n\nUn email de confirmation a été envoyé. Veuillez le valider pour pouvoir vous connecter.');
                window.location.href = 'login.html';
            } catch (error) {
                alert('Erreur lors de l\'inscription : ' + error.message);
            } finally {
                btnRegister.disabled = false;
                btnRegister.textContent = 'Créer mon compte';
            }
        });
    }
});
