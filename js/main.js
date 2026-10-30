// Configuration Supabase
const SUPABASE_URL = 'https://drgbsrfwepqwletfstaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1PdFR-tSzvnLNiP16p3hFg_douwIesc';

// Configuration Ollama
const OLLAMA_URL = 'https://ollama.com/api/chat';
const OLLAMA_MODEL = 'gemma4:31b-cloud';

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

                // 3. Appel à Ollama
                const response = await fetch(OLLAMA_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: OLLAMA_MODEL,
                        prompt: prompt,
                        stream: false
                    })
                });

                if (!response.ok) throw new Error('Erreur de communication avec Ollama');

                const result = await response.json();
                const generatedHtml = result.response;

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
                alert(`Erreur : ${error.message}. \nVérifiez que Ollama tourne bien avec OLLAMA_ORIGINS="*"`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }

        });
    }
});
