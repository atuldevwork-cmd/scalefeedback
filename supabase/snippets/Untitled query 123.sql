CREATE OR REPLACE FUNCTION public.handle_new_user()                                                                                                                 
  RETURNS TRIGGER AS $$                                                                                                                                               
  DECLARE                                                                                                                                                             
    new_org_id uuid;                                                                                                                                                  
    org_slug text;                                                                                                                                                    
  BEGIN                                                                                                                                                             
    org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'))                                                                           
      || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);                                                                                                         
                                                                                                                                                                      
    INSERT INTO public.organisations (name, slug, plan)                                                                                                               
    VALUES (                                                                                                                                                          
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',                                                               
      org_slug, 'free'                                                                                                                                                
    ) RETURNING id INTO new_org_id;                                                                                                                                   
                                                                                                                                                                      
    INSERT INTO public.members (organisation_id, user_id, role, accepted_at)                                                                                          
    VALUES (new_org_id, NEW.id, 'owner', now());                                                                                                                    
                                                                                                                                                                      
    RETURN NEW;
  END;                                                                                                                                                                
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;                                                                                                    
                                                                                                                                                                    
  CREATE OR REPLACE FUNCTION public.handle_new_user_profile()                                                                                                         
  RETURNS TRIGGER AS $$
  BEGIN                                                                                                                                                               
    INSERT INTO public.profiles (id, full_name, avatar_url)                                                                                                         
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url');                          
    RETURN NEW;                                                                                                                                                       
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;                                                                                                      
                                                                                                                                                                      
  CREATE OR REPLACE FUNCTION public.handle_new_user_notif_prefs()                                                                                                   
  RETURNS TRIGGER AS $$                                                                                                                                               
  BEGIN                                                                                                                                                             
    INSERT INTO public.user_notification_preferences (user_id) VALUES (NEW.id);                                                                                     
    RETURN NEW;                                                                                                                                                       
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;                                                                                                      
                                                                                                                                                                      
  CREATE OR REPLACE FUNCTION public.handle_new_org_subscription()                                                                                                   
  RETURNS TRIGGER AS $$                                                                                                                                               
  BEGIN                                                                                                                                                             
    INSERT INTO public.subscriptions (organisation_id, plan, status) VALUES (NEW.id, 'free', 'active');                                                             
    RETURN NEW;                                                                                                                                                       
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;    