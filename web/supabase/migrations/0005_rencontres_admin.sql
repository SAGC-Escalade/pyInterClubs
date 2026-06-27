-- =====================================================================
-- Tranche 3 — Administration des rencontres (cycle de vie)
-- Réf. : docs/spec/03-workflows-admin.md §3/§4/§9
-- =====================================================================
-- Couvre : liste des rencontres (vue d'administration), sélection de la
-- « rencontre courante » (clé config DEFAULT_RENCONTRE) et assistant de
-- création (rencontre + lignes rencontre_voie). L'écriture sur `rencontre`
-- et `rencontre_voie` est déjà réservée à l'admin (0004 admin_write).
--
-- Le démarrage/arrêt (provisioning des comptes coach/juge + QR) dépend de
-- l'auth token/QR (doc 10) et fera l'objet d'une tranche ultérieure.
-- =====================================================================

-- --------------------------------------------------------------------
-- Vue d'administration des rencontres : entête + club hôte + compteurs.
-- Réservée aux utilisateurs authentifiés (la page publique lit `rencontre`
-- directement, doc 03 §3). Aucune donnée sensible (config) n'y transite.
-- --------------------------------------------------------------------
create or replace view public.v_rencontre_admin as
select
  r.id,
  r.saison,
  r.date,
  r.categorie,
  r.nb_bloc,
  r.nb_diff,
  r.nb_vitesse,
  r.voies_reutilisables,
  r.voies_groupees,
  r.club_id,
  c.nom   as club_nom,
  c.ville as club_ville,
  (select count(*) from public.rencontre_voie rv where rv.rencontre_id = r.id) as nb_voies,
  (select count(*) from public.equipe e         where e.rencontre_id  = r.id) as nb_equipes
from public.rencontre r
join public.club c on c.id = r.club_id;

grant select on public.v_rencontre_admin to authenticated;

-- --------------------------------------------------------------------
-- Sélection de la « rencontre courante » (doc 03 §3).
-- La table `config` n'est pas exposée en écriture aux clients (elle peut
-- porter des secrets, ex. Wi-Fi). On passe par une fonction admin-gardée
-- qui (dé)pose la clé DEFAULT_RENCONTRE. `default_rencontre_id()` (0003)
-- reste la lecture effective (explicite sinon plus récente).
-- --------------------------------------------------------------------
create or replace function public.fn_set_default_rencontre(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_is_admin() then
    raise exception 'Action réservée à l''administrateur' using errcode = '42501';
  end if;

  if p_id is null then
    delete from public.config where key = 'DEFAULT_RENCONTRE';
    return;
  end if;

  if not exists (select 1 from public.rencontre where id = p_id) then
    raise exception 'Rencontre % introuvable', p_id using errcode = 'P0002';
  end if;

  insert into public.config (key, type, value)
  values ('DEFAULT_RENCONTRE', 'int', p_id::text)
  on conflict (key) do update set value = excluded.value, type = 'int';
end$$;

grant execute on function public.fn_set_default_rencontre(bigint) to authenticated;
