-- Fonction à exécuter dans l'éditeur SQL de Supabase (une seule fois)
-- Elle supprime toutes les données d'un client en une seule transaction atomique.
-- SECURITY DEFINER : s'exécute avec les droits du propriétaire, contourne le RLS.
-- La vérification admin se fait en interne.

CREATE OR REPLACE FUNCTION supprimer_client(p_client_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email TEXT;
  v_is_admin     BOOLEAN;
BEGIN
  -- Vérifier que l'appelant authentifié est admin
  SELECT email INTO v_caller_email
  FROM auth.users
  WHERE id = auth.uid();

  SELECT is_admin INTO v_is_admin
  FROM public.clients
  WHERE email = v_caller_email;

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Accès refusé : vous n''êtes pas administrateur';
  END IF;

  -- Suppression dans l'ordre des clés étrangères (transaction implicite en plpgsql)
  DELETE FROM public.notifications        WHERE client_id = p_client_id;
  DELETE FROM public.recompenses_utilisees WHERE client_id = p_client_id;
  DELETE FROM public.sessions             WHERE client_id = p_client_id;
  DELETE FROM public.clients              WHERE id        = p_client_id;
END;
$$;
