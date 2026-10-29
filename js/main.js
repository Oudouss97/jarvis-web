// Configuration Supabase
// REMPLACEZ CES VALEURS PAR VOS PROPRES CLÉS DANS VOTRE DASHBOARD SUPABASE
const SUPABASE_URL = 'VOTRE_SUPABASE_URL';
const SUPABASE_KEY = 'VOTRE_SUPABASE_ANON_KEY';

// Initialisation du client Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('fiche-form');
    const resultSection = document.getElementById('result-section');
    const ficheOutput = document.getElementById('fiche-output');
    const authCard = document.getElementById('auth-card');
    const authSection = document.getElementById('auth-section');
    const btnAuthSubmit = document.getElementById('btn-auth-submit');

    // --- GESTION AUTHENTIFICATION ---

    async function checkUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;

            if (user) {
                authSection.innerHTML = `<span style="font-size: 0.9rem; margin-right: 1rem;">Bonjour, ${user.email}</span>
                                         <a href="#" id="btn-logout" style="color: var(--primary); font-weight: 600;">Déconnexion</a>`;

                document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await supabase.auth.signOut();
                    location.reload();
                });
                authCard.classList.add('hidden');
            } else {
                authSection.innerHTML = `<a href="#" id="btn-login">Connexion</a>`;
                document.getElementById('btn-login')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    authCard.classList.toggle('hidden');
                });
            }
        } catch (err) {
            console.error('Erreur auth:', err);
        }
    }

    btnAuthSubmit.addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (!email || !password) return alert('Veuillez remplir tous les champs');

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                // Tentative d'inscription si la connexion échoue
                const { error: signUpError } = await supabase.auth.signUp({ email, password });
                if (signUpError) throw signUpError;
                else alert('Compte créé ! Vérifiez vos emails pour confirmer l\'inscription.');
            } else {
                location.reload();
            }
        } catch (error) {
            alert('Erreur : ' + error.message);
        }
    });

    await checkUser();

    // --- GESTION GÉNÉRATION FICHE ---

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Vous devez être connecté pour sauvegarder vos fiches.');
            authCard.classList.remove('hidden');
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

            const { error } = await supabase
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
