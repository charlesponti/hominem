-- +goose Up
DROP POLICY IF EXISTS app_people_owner_policy ON app.people;
CREATE POLICY app_people_select_policy ON app.people
  FOR SELECT
  USING (
    auth.can_access_entity('app.people'::regclass, id)
  );

CREATE POLICY app_people_owner_write_policy ON app.people
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );

DROP POLICY IF EXISTS app_places_owner_policy ON app.places;
CREATE POLICY app_places_select_policy ON app.places
  FOR SELECT
  USING (
    auth.can_access_entity('app.places'::regclass, id)
  );

CREATE POLICY app_places_owner_write_policy ON app.places
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );

DROP POLICY IF EXISTS app_bookmarks_owner_policy ON app.bookmarks;
CREATE POLICY app_bookmarks_select_policy ON app.bookmarks
  FOR SELECT
  USING (
    auth.can_access_entity('app.bookmarks'::regclass, id)
  );

CREATE POLICY app_bookmarks_owner_write_policy ON app.bookmarks
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );

-- +goose Down
DROP POLICY IF EXISTS app_bookmarks_owner_write_policy ON app.bookmarks;
DROP POLICY IF EXISTS app_bookmarks_select_policy ON app.bookmarks;
CREATE POLICY app_bookmarks_owner_policy ON app.bookmarks
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );

DROP POLICY IF EXISTS app_places_owner_write_policy ON app.places;
DROP POLICY IF EXISTS app_places_select_policy ON app.places;
CREATE POLICY app_places_owner_policy ON app.places
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );

DROP POLICY IF EXISTS app_people_owner_write_policy ON app.people;
DROP POLICY IF EXISTS app_people_select_policy ON app.people;
CREATE POLICY app_people_owner_policy ON app.people
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  );
