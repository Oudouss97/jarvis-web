// Configuration Supabase
const SUPABASE_URL = 'https://drgbsrfwepqwletfstaw.supabase.co';
// ⚠️ REMPLACE LA LIGNE CI-DESSOUS PAR TA CLÉ 'anon' (qui commence par eyJ...)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZ2JzcmZ3ZXBxd2xldGZzdGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNjM1MzUsImV4cCI6MjEwODgzOTUzNX0.uTxSScj67U9F4U9gHX6v8RPhowRIxL2bl0l68ZY60E0'; 

let currentUser = null; // Variable globale pour stocker l'utilisateur connecté

// Initialisation du client Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('fiche-form');
    const authSection = document.getElementById('auth-section');

    // --- GESTION AUTHENTIFICATION ET PROTECTION DE PAGE ---

    async function protectPage() {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();

            if (error || !session) {
                console.log("🚫 Accès non autorisé. Redirection vers login...");
                window.location.href = 'login.html';
                return false;
            }

            currentUser = session.user; // Sauvegarde de l'utilisateur dans la variable globale
            console.log("✅ Accès autorisé pour :", currentUser.email);

            // Mise à jour de l'UI avec le nom de l'utilisateur
            authSection.innerHTML = `<span style="font-size: 0.9rem; margin-right: 1rem;">Bonjour, ${currentUser.email}</span>
                                     <a href="#" id="btn-logout" style="color: var(--primary); font-weight: 600;">Déconnexion</a>`;

            document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });

            return true;
        } catch (err) {
            console.error('Erreur critique d\'authentification:', err);
            window.location.href = 'login.html';
            return false;
        }
    }

    // ÉTAPE CRUCIALE : On protège la page AVANT toute autre action
    const isAuthorized = await protectPage();

    if (!isAuthorized) return; // On arrête tout si l'utilisateur n'est pas connecté

    // --- GESTION GÉNÉRATION FICHE ---

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                discipline: document.getElementById('discipline').value,
                level: document.getElementById('level').value,
                theme: document.getElementById('theme').value,
                duration: document.getElementById('duration').value,
                context: document.getElementById('context').value
            };

            const submitBtn = form.querySelector('.btn-generate');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>L\'IA rédige votre fiche...</span>';

            try {
                // 1. Récupérer la structure de référence
                const structureResponse = await fetch('structure_fiche.md');
                const structureText = await structureResponse.text();

                // 2. Construire le prompt système
                const prompt = `Tu es un expert en pédagogie pour le primaire et le préscolaire.
                Sert-toi EXCLUSIVEMENT de la structure suivante pour rédiger la fiche :
                ---
                ${structureText}
                ---
                Rédige maintenant une fiche complète et argumentée pour :
                - Discipline : ${formData.discipline}
                - Niveau : ${formData.level}
                - Thème : ${formData.theme}
                - Durée : ${formData.duration} mn
                - Notes : ${formData.context}

                L'output doit être en HTML pur (sans balises <html> ou <body>), utilisant des <table> pour le corps de la fiche,
                en respectant scrupuleusement les colonnes : Étapes, Contenus, Activités du Maître, Activités des Enfants, Justifications.`;

                // 3. Appel à la fonction Supabase (Sécurisé)
                // On passe explicitement le token d'authentification pour éviter les erreurs 400/401
                const { data, error } = await supabaseClient.functions.invoke('generate-fiche', {
                    body: { prompt: prompt },
                    headers: {
                        Authorization: `Bearer ${(await supabaseClient.auth.getSession()).data.session?.access_token}`
                    }
                });

                if (error) throw new Error(`Erreur serveur : ${error.message}`);

                // Vérification de la réponse
                if (!data || !data.content) {
                    throw new Error("La réponse de l'IA est vide ou mal formatée.");
                }

                const generatedHtml = data.content;

                // 4. Tentative de sauvegarde dans Supabase (Non-bloquante)
                if (currentUser) {
                    try {
                        const { error } = await supabaseClient
                            .from('lesson_plans')
                            .insert([{
                                user_id: currentUser.id,
                                discipline: formData.discipline,
                                level: formData.level,
                                theme: formData.theme,
                                duration: parseInt(formData.duration),
                                content: { html: generatedHtml },
                            }]);
                        if (error) console.error('⚠️ Erreur sauvegarde Supabase:', error);
                    } catch (saveError) {
                        console.error('⚠️ Échec critique sauvegarde Supabase:', saveError);
                    }
                }

                // Sauvegarde locale pour la page de visualisation
                localStorage.setItem('last_generated_fiche', JSON.stringify({
                    html: generatedHtml,
                    timestamp: new Date().toISOString()
                }));

                // Redirection immédiate vers la page de la fiche
                window.location.href = 'fiche.html';


            } catch (error) {
                console.error('Erreur lors de la génération:', error);
                alert(`Erreur : ${error.message}. \nVeuillez réessayer ou contacter l'administrateur.`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }

        });
    }
});