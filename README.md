# medicaments
Get informations on medicine in french

## TODO
- ADD ALL THESE FILE IN DB : http://base-donnees-publique.medicaments.gouv.fr/telechargement.php
  - It CREATE INFOS.HTM
- download Notice & RCP in PDF si numero_autorisation_eur : {$ne : ""} avec le dernier numero du slash dans le numéro d'autorisation
- créer pages de génériques
- ADD EMA informations :
 - pour la recherche sur le site de l'EMA :
    Requête en GET Simple sur l'url : http://www.ema.europa.eu/ema/index.jsp?curl=pages%2Fincludes%2Fmedicines%2Fmedicines_landing_page.jsp&searchkwByEnter=false&quickSearch=ABILIFY+MAINTENA&keywordSearch=Submit
    - Supprimer tous les mots du param quickSearch jusqu'à obtenir un résultat (=résultat dans la partie medicine)
    - Suivre le lien :(
    - Récupérer le lien du PDF en français :(((

- Base.html
 - premier parapgraphe peut être :
    - informations générées
    - début de notice
    - Enreg homéo : texte : Ce médicament est un médicament homéopathique à nom commun soumis à enregistrement. Aucune indication thérapeutique, aucune posologie et aucune notice ne sont attribuées aux médicaments homéopathiques à nom commun. En effet, pour ces médicaments, il revient aux professionnels de santé d'en déterminer l'indication (pathologies ou symptômes) et la posologie. L'indication et la posologie sont ainsi adaptées à chaque patient en prenant en compte les données de l'usage traditionnel homéopathique. Ces médicaments peuvent être délivrés par le pharmacien sans prescription médicale.

 - adapter aux mobiles (unités à mettre en viewport avec polyfill en px)

 - Créer application avec React avec construction des pages ) la volée depuis interrogation serveur

 PROCEDURE CREATION FICHE :
  1. Télécharger tous les fichiers de DB
  2. Insérer les fichiers en DB
  3. Parcourir les CIP :
    - Pour chaque CIP de specialite :
        - Si CIP présent dans specialiteAddon :
            - Si specialite[cip].code_rcp_notice =>
                - download (64226300 rcp avec images) à l'adresse: http://agence-prd.ansm.sante.fr/php/ecodex/rcp/R0242883.htm
                - download (64226300 notice avec images) à l'adresse: http://agence-prd.ansm.sante.fr/php/ecodex/notice/N0242883.htm
            - Sinon si specialiteAddon[cip].numero_autorisation_eur: (65877011)
                - download RCP PDF (69643760 PDF) à l'adresse : "http://m.base-donnees-publique.medicaments.gouv.fr/www/pdf/rcp/rcp-" + numero_autorisation_eur.split('/')[3] + ".pdf
                - download Notice PDF (69643760 PDF) à l'adresse : "http://m.base-donnees-publique.medicaments.gouv.fr/www/pdf/notice/notice-" + numero_autorisation_eur.split('/')[3] + ".pdf

        - Sinon :
            - Si specialite[cip].code_rcp_notice =>
                  - download (64226300 rcp avec images) à l'adresse: http://agence-prd.ansm.sante.fr/php/ecodex/rcp/R0242883.htm
                  - download (64226300 notice avec images) à l'adresse: http://agence-prd.ansm.sante.fr/php/ecodex/notice/N0242883.htm

        - Construction de l'index.html de chaque CIS
            - Si notice.pdf / rcp.pdf lien direct vers le PDF
            - Sinon si notice.html / rcp.html alors on récupère les infos pour les mettre sous forme d'onglets
            - Sinon si specialiteAddon => on construit la page depuis les infos des addons
            - Sinon on construit la pge depuis les infos de specialite, presentation, composition




