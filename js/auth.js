// Configuration Supabase
const SUPABASE_URL = 'https://drgbsrfwepqwletfstaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1PdFR-tSzvnLNiP16p3hFg_douwIesc';

// Initialisation avec persistance forcée pour éviter les erreurs de session
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const btnAuth = document.getElementById('btn-auth');

    if (!authForm) return;

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) return alert('Veuillez remplir tous les champs');

        btnAuth.disabled = true;
        btnAuth.textContent = 'Traitement...';

        try {
            // 1. Tentative de connexion
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.log("Connexion échouée, tentative d'inscription...");
                // 2. Tentative d'inscription si la connexion échoue
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: email,
                    password: password
                });

                if (signUpError) throw signUpError;

                alert('Compte créé avec succès ! Un email de confirmation a été envoyé.');
            } else {
                // Succès : redirection vers l'accueil
                window.location.href = 'index.html';
            }
        } catch (error) {
            alert('Erreur : ' + error.message);
        } finally {
            btnAuth.disabled = false;
            btnAuth.textContent = 'Se connecter / S\'inscrire';
        }
    });
});
