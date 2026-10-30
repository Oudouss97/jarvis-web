// Configuration Supabase (Identique à main.js)
const SUPABASE_URL = 'https://drgbsrfwepqwletfstaw.co';
const SUPABASE_KEY = 'sb_publishable_1PdFR-tSzvnLNiP16p3hFg_douwIesc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const ficheOutput = document.getElementById('fiche-output');

    async function loadFiche() {
        try {
            // 1. Vérification de la session
            const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
            if (authError || !session) {
                window.location.href = 'login.html';
                return;
            }

            // 2. Récupération des données du localStorage
            const ficheData = localStorage.getItem('last_generated_fiche');

            if (!ficheData) {
                ficheOutput.innerHTML = `<div style="text-align:center; color:red;">
                    <p>Aucune fiche trouvée. Veuillez retourner au générateur.</p>
                    <a href="index.html" class="btn-primary">Retour au générateur</a>
                </div>`;
                return;
            }

            const parsedData = JSON.parse(ficheData);

            // 3. Affichage du contenu
            // On utilise innerHTML car l'IA génère du HTML pur avec des tables
            ficheOutput.innerHTML = parsedData.html;

        } catch (err) {
            console.error('Erreur lors du chargement de la fiche:', err);
            ficheOutput.innerHTML = `<p style="color: red; text-align: center;">Une erreur est survenue lors de l'affichage de la fiche.</p>`;
        }
    }

    loadFiche();
});
