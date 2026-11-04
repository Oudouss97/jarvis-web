// Configuration Supabase
const SUPABASE_URL = 'https://drgbsrfwepqwletfstaw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZ2JzcmZ3ZXBxd2xldGZzdGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNjM1MzUsImV4cCI6MjEwODgzOTUzNX0.uTxSScj67U9F4U9gHX6v8RPhowRIxL2bl0l68ZY60E0'; 

let currentUser = null;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('fiche-form');
    const authSection = document.getElementById('auth-section');

    async function protectPage() {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
                window.location.href = 'login.html';
                return false;
            }
            currentUser = session.user;
            authSection.innerHTML = `<span style="font-size: 0.9rem; margin-right: 1rem;"></span>
                                     <a href="#" id="btn-logout" style="color: var(--primary); font-weight: 600;">Déconnexion</a>`;
            document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
            return true;
        } catch (err) {
            window.location.href = 'login.html';
            return false;
        }
    }

    const isAuthorized = await protectPage();
    if (!isAuthorized) return;

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
                // 1. Détection automatique du niveau pour choisir le bon fichier .md
                let fichierStructure = 'structure_elementaire.md'; // Par défaut
                if (formData.level.includes('Section') || formData.level.includes('PS') || formData.level.includes('MS') || formData.level.includes('GS')) {
                    fichierStructure = 'structure_prescolaire.md';
                }

                const structureResponse = await fetch(fichierStructure);
                const structureText = await structureResponse.text();

                // 2. Construire le prompt pour l'Agent Générateur
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

                // 3. APPEL À L'AGENT 1 : Générateur
                const { data, error } = await supabaseClient.functions.invoke('generate-fiche', {
                    body: { prompt: prompt }
                });

                if (error) throw new Error(`Erreur serveur (Générateur) : ${error.message}`);
                if (!data || !data.content) throw new Error("La réponse du Générateur est vide.");

                let generatedHtml = data.content;

                // 4. APPEL À L'AGENT 2 : Vérificateur
                submitBtn.innerHTML = '<span>L\'IA vérifie la fiche...</span>';
                console.log("Envoi à l'agent vérificateur...");

                const { data: verifData, error: verifError } = await supabaseClient.functions.invoke('verifier-fiche', {
                    body: { fiche_html: generatedHtml }
                });

                if (verifError) {
                    console.error('⚠️ Erreur Agent Vérificateur:', verifError);
                    // Si le vérificateur échoue, on garde quand même la fiche originale
                } else if (verifData && verifData.resultat) {
                    if (verifData.resultat !== 'VALIDE') {
                        console.log("L'agent vérificateur a corrigé la fiche.");
                        generatedHtml = verifData.resultat; // On remplace par la version corrigée
                    } else {
                        console.log("L'agent vérificateur a validé la fiche.");
                    }
                }

                // 5. Sauvegarde Supabase (avec la fiche finale validée)
                if (currentUser) {
                    try {
                        const { error: saveError } = await supabaseClient
                            .from('lesson_plans')
                            .insert([{
                                user_id: currentUser.id,
                                discipline: formData.discipline,
                                level: formData.level,
                                theme: formData.theme,
                                duration: parseInt(formData.duration),
                                content: { html: generatedHtml },
                            }]);
                        if (saveError) console.error('⚠️ Erreur sauvegarde Supabase:', saveError);
                    } catch (saveError) {
                        console.error('⚠️ Échec critique sauvegarde Supabase:', saveError);
                    }
                }

                // 6. Sauvegarde locale et redirection
                localStorage.setItem('last_generated_fiche', JSON.stringify({
                    html: generatedHtml,
                    timestamp: new Date().toISOString()
                }));

                window.location.href = 'fiche.html';

            } catch (error) {
                console.error('Erreur lors de la génération:', error);
                alert(`Erreur : ${error.message}. \nVeuillez réessayer.`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
});