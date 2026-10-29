// Configuration Supabase
const SUPABASE_URL = 'https://drgbsrfwepqwletfstaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1PdFR-tSzvnLNiP16p3hFg_douwIesc';

// Configuration Ollama
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'gemma4:31b-cloud';

// Initialisation du client Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('fiche-//generate'); // Correction ici
    const resultSection = document.getElementById('result-section');
    const ficheOutput = document.getElementById('fiche-output');
    const authSection = document.getElementById('auth-section');

    // Correction du sélecteur de formulaire qui avait une erreur dans la version précédente
    const realForm = document.getElementById('fiche-form');

    async function updateAuthUI(user) {
        if (user) {
            authSection.innerHTML = `<span style="font-size: 0.9rem; margin-right: 1rem;">Bonjour, ${user.email}</span>
                                     <a href="#" id="btn-logout" style="color: var(--primary); font-weight: 600;">Déconnexion</a>`;

            document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabaseClient.auth.signOut();
                location.reload();
            });
        } else {
            authSection.innerHTML = `<a href="login.html" id="btn-login">Connexion</a>`;
        }
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        updateAuthUI(session?.user);
    });

    const { data: { session } } = await supabaseClient.auth.getSession();
    updateAuthUI(session?.user);

    // --- GESTION GÉNÉRATION RÉELLE VIA OLLAMA ---

    realForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Vous devez être connecté pour sauvegarder vos fiches.');
            window.location.href = 'login.html';
            return;
        }

        const formData = {
            discipline: document.getElementById('discipline').value,
            level: document.getElementById('level').value,
            theme: document.getElementById('theme').value,
            duration: document.getElementById('duration').value,
            context: document.getElementById('context').value
        };

        const submitBtn = realForm.querySelector('.btn-generate');
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

            // 4. Sauvegarde dans Supabase
            const { error } = await supabaseClient
                .from('lesson_plans')
                .insert([{
                    user_id: user.id,
                    discipline: formData.discipline,
                    level: formData.level,
                    theme: formData.theme,
                    duration: parseInt(formData.duration),
                    content: { html: generatedHtml },
                }]);

            if (error) throw error;

            ficheOutput.innerHTML = generatedHtml;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            ficheOutput.innerHTML = `<p style="color: red; text-align: center;">Erreur : ${error.message}. <br>Vérifiez que Ollama tourne bien avec OLLAMA_ORIGINS="*"</p>`;
            resultSection.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
});
