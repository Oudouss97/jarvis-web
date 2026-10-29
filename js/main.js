// Configuration Supabase
const SUPABASE_URL = 'https://drgbsrfwepqwletfstaw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1PdFR-tSzvnLNiP16p3hFg_douwIesc';

// Initialisation du client Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('fiche-form');
    const resultSection = document.getElementById('result-section');
    const ficheOutput = document.getElementById('fiche-output');
    const authSection = document.getElementById('auth-section');

    // --- GESTION AUTHENTIFICATION ROBUSTE ---

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

    // Écoute les changements de session en temps réel
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log("Auth Event:", event);
        updateAuthUI(session?.user);
    });

    // Vérification initiale au chargement
    const { data: { session } } = await supabaseClient.auth.getSession();
    updateAuthUI(session?.user);

    // --- GESTION GÉNÉRATION FICHE ---

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Vous devez être connecté pour sauvegarder vos fiches. Redirection vers la page de connexion...');
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

        const submitBtn = form.querySelector('.btn-generate');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Génération et sauvegarde...</span>';

        try {
            const mockResult = simulateGeneration(formData);

            const { error } = await supabaseClient
                .from('lesson_plans')
                .insert([{
                    user_id: user.id,
                    discipline: formData.discipline,
                    level: formData.level,
                    theme: formData.theme,
                    duration: parseInt(formData.duration),
                    content: { html: mockResult },
                }]);

            if (error) throw error;

            ficheOutput.innerHTML = mockResult;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            ficheOutput.innerHTML = `<p style="color: red; text-align: center;">Erreur : ${error.message}</p>`;
            resultSection.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    function simulateGeneration(data) {
        const escape = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        return `
            <div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 20px;">
                MINISTÈRE DE L'ÉDUCATION NATIONALE<br>
                INSPECTION D’ACADÉMIE DE KOLDA
            </div>
            <div style="text-align: right; margin-bottom: 20px;">
                Date : ${new Date().toLocaleDateString()} | Durée : ${escape(data.duration)} mn
            </div>
            <h2 style="text-align: center; margin-bottom: 20px;">FICHE PÉDAGOGIQUE : ${escape(data.theme)}</h2>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;" border="1">
                <tr style="background: #f2f2f2;">
                    <th style="padding: 10px;">Rubrique</th>
                    <th style="padding: 10px;">Contenu</th>
                    <th style="padding: 10px;">Justification</th>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Objet</td>
                    <td style="padding: 10px;">${escape(data.theme)}</td>
                    <td style="padding: 10px;">Conforme au programme officiel.</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Objectif Opérationnel</td>
                    <td style="padding: 10px;">Au terme de la séance, les élèves de ${escape(data.level)} seront capables de maîtriser ${escape(data.theme)} sans se tromper plus de deux fois.</td>
                    <td style="padding: 10px;">Développer les compétences cognitives de l'enfant.</td>
                </tr>
            </table>

            <p><strong>Note :</strong> Ceci est un aperçu simulé. L'IA utilisera le fichier <em>structure_fiche.md</em> pour générer le contenu réel.</p>
        `;
    }
});
