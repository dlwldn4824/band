export type UserRole = 'guest' | 'admin' | 'performer' | 'anonymous'

export type AnalyticsEventName =
  | 'page_view'
  | 'login_attempted'
  | 'login_succeeded'
  | 'login_failed'
  | 'admin_login_succeeded'
  | 'dashboard_viewed'
  | 'nickname_set'
  | 'timeline_event_clicked'
  | 'performances_viewed'
  | 'song_detail_opened'
  | 'song_comment_posted'
  | 'events_page_viewed'
  | 'feature_card_clicked'
  | 'drink_modal_opened'
  | 'drink_order_submitted'
  | 'drink_payment_confirmed'
  | 'directions_modal_opened'
  | 'kakao_map_opened'
  | 'game_started'
  | 'game_finished'
  | 'entry_draw_completed'
  | 'chat_page_viewed'
  | 'chat_blocked_viewed'
  | 'chat_message_sent'
  | 'guestbook_message_posted'
  | 'guests_upload_completed'
  | 'setlist_upload_completed'
  | 'feature_toggle_changed'
  | 'performance_info_saved'
  | 'guest_payment_toggled'
  | 'guest_ticket_toggled'
  | 'drink_order_provided'
  | 'session_started'
  | 'session_ended'
  | 'page_dwell_time'
  | 'error_occurred'
  | 'nav_tab_clicked'
  | 'cta_clicked'
  | 'modal_opened'
  | 'modal_closed'
  | 'back_navigation'
  | 'feature_access_denied'
  | 'abandoned_funnel_step'
  | 'button_click_no_follow'
  | 'core_feature_used'
  | 'checkin_completed'
  | 'manage_page_viewed'
  | 'performances_empty_state_viewed'
  | 'events_redirected'
  | 'entry_source_detected'
  | 'booking_submitted'
  | 'bookings_import_backfilled'
  | 'banner_impression'
  | 'booking_page_viewed'
  | 'booking_form_started'
  | 'booking_confirmation_viewed'
  | 'booking_payment_confirmed'

export interface UtmProperties {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export interface EventPropertiesMap {
  page_view: {
    page_path?: string
    referrer?: string
    entry_type?: 'direct' | 'token' | 'qr'
    token_present?: boolean
  } & UtmProperties
  login_attempted: {
    login_method: 'name_phone' | 'token'
    has_token?: boolean
  }
  login_succeeded: {
    has_entry_number?: boolean
    payment_confirmed?: boolean
    is_walk_in?: boolean
  } & UtmProperties
  login_failed: {
    fail_reason: 'not_found' | 'phone_mismatch' | 'deleted' | 'empty_guests'
    retry_count?: number
  } & UtmProperties
  admin_login_succeeded: {
    admin_name: string
    is_performer: boolean
  }
  dashboard_viewed: {
    has_nickname?: boolean
    payment_status?: boolean
    ticket_received?: boolean
  }
  nickname_set: {
    nickname_length: number
  }
  timeline_event_clicked: {
    event_index: number
    event_title: string
    target_part?: string
  }
  performances_viewed: {
    selected_part?: string
    section_title?: string
    days_since_setlist_upload?: number
  }
  song_detail_opened: {
    song_name: string
    part?: string | number
    song_index?: number
  }
  song_comment_posted: {
    song_name: string
    message_length: number
  }
  events_page_viewed: {
    enabled_features?: string[]
  }
  feature_card_clicked: {
    feature_name: string
  }
  drink_modal_opened: {
    source: 'dashboard_banner' | 'events_card' | string
  }
  drink_order_submitted: {
    beer_qty: number
    mojito_qty: number
    total_amount: number
    is_admin_price: boolean
    source?: string
    order_id?: string
    is_event_day?: boolean
    days_before_performance?: number
  }
  drink_payment_confirmed: {
    order_id: string
    confirm_latency_hours?: number
  }
  directions_modal_opened: Record<string, never>
  kakao_map_opened: Record<string, never>
  game_started: {
    game_type: 'draw' | 'ledboard' | 'roulette' | string
  }
  game_finished: {
    game_type: string
    duration_sec?: number
  }
  entry_draw_completed: {
    winner_count: number
  }
  chat_page_viewed: {
    chat_enabled: boolean
  }
  chat_blocked_viewed: Record<string, never>
  chat_message_sent: {
    message_length: number
  }
  guestbook_message_posted: {
    ornament_type?: string
  }
  guests_upload_completed: {
    guest_count: number
    duplicate_removed_count?: number
  }
  setlist_upload_completed: {
    song_count: number
    performer_count?: number
    uploaded_at?: number
  }
  feature_toggle_changed: {
    feature_name: string
    enabled: boolean
  }
  performance_info_saved: {
    section_count?: number
    section_titles?: string[]
  }
  guest_payment_toggled: {
    guest_id_hash: string
    new_status: boolean
    hours_since_booking?: number
    days_before_performance_at_booking?: number
  }
  guest_ticket_toggled: {
    guest_id_hash: string
    new_status: boolean
  }
  drink_order_provided: {
    order_id: string
    provide_latency_min?: number
  }
  session_started: {
    is_returning: boolean
    days_since_last?: number
  } & UtmProperties
  session_ended: {
    duration_sec: number
    last_page: string
    pages_visited_count: number
    last_active_feature?: string
  }
  page_dwell_time: {
    page_path: string
    duration_sec: number
  }
  error_occurred: {
    error_code?: string
    error_context?: string
    page_path?: string
  }
  nav_tab_clicked: {
    from_page: string
    to_page: string
    tab_name: string
  }
  cta_clicked: {
    cta_name: string
    source_page: string
    banner_id?: string
    placement?: string
  }
  modal_opened: {
    modal_name: string
    source?: string
  }
  modal_closed: {
    modal_name: string
    source?: string
    duration_sec?: number
  }
  back_navigation: {
    from_page: string
    to_page: string
  }
  feature_access_denied: {
    reason: 'events_disabled' | 'chat_blocked' | 'not_logged_in' | string
  }
  abandoned_funnel_step: {
    funnel_name: string
    last_step: string
  }
  button_click_no_follow: {
    button_name: string
    page_path?: string
  }
  core_feature_used: {
    features: string[]
  }
  checkin_completed: {
    guest_id_hash?: string
    is_walk_in?: boolean
  }
  manage_page_viewed: Record<string, never>
  performances_empty_state_viewed: Record<string, never>
  events_redirected: {
    enabled: boolean
  }
  entry_source_detected: {
    entry_type: 'direct' | 'token' | 'qr'
    page_path: string
  }
  booking_submitted: {
    source: 'web_login' | 'onsite' | 'admin_approve' | 'excel_import'
    is_walk_in: boolean
    booked_at: number
    days_before_performance?: number
    performance_date?: string | null
  } & UtmProperties
  bookings_import_backfilled: {
    import_count: number
    with_excel_date_count: number
    defaulted_to_now_count: number
  }
  banner_impression: {
    banner_id: string
    placement: string
  }
  booking_page_viewed: {
    entry_type?: 'direct' | 'token' | 'qr'
  } & UtmProperties
  booking_form_started: {
    field?: 'name' | 'phone'
  }
  booking_confirmation_viewed: Record<string, never>
  booking_payment_confirmed: {
    guest_id_hash: string
    hours_since_booking?: number
    days_before_performance_at_booking?: number
  }
}

export type EventProperties<E extends AnalyticsEventName> = E extends keyof EventPropertiesMap
  ? EventPropertiesMap[E]
  : Record<string, unknown>

export interface AnalyticsContext {
  userId: string | null
  userRole: UserRole
  pagePath: string
  performanceId: string | null
  isEventDay: boolean
  clientId: string
  sessionId: string
}

export interface AnalyticsEventDoc {
  eventName: AnalyticsEventName
  properties: Record<string, unknown>
  userId: string | null
  sessionId: string
  userRole: UserRole
  pagePath: string
  deviceType: string
  performanceId: string | null
  isEventDay: boolean
  clientId: string
  createdAtClient: number
}
