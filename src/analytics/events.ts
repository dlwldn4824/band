import type { AnalyticsEventName } from './types'

export const P0_EVENTS: AnalyticsEventName[] = [
  'page_view',
  'login_attempted',
  'login_succeeded',
  'login_failed',
  'admin_login_succeeded',
  'session_started',
  'session_ended',
  'dashboard_viewed',
  'performances_viewed',
  'events_page_viewed',
]

export const P1_EVENTS: AnalyticsEventName[] = [
  'drink_modal_opened',
  'drink_order_submitted',
  'drink_payment_confirmed',
  'drink_order_provided',
  'chat_page_viewed',
  'chat_blocked_viewed',
  'chat_message_sent',
  'checkin_completed',
  'guests_upload_completed',
  'setlist_upload_completed',
  'feature_toggle_changed',
  'guest_payment_toggled',
  'guest_ticket_toggled',
  'performance_info_saved',
  'manage_page_viewed',
  'booking_submitted',
  'bookings_import_backfilled',
  'booking_page_viewed',
  'booking_form_started',
  'booking_confirmation_viewed',
  'booking_payment_confirmed',
]

export const P2_EVENTS: AnalyticsEventName[] = [
  'song_detail_opened',
  'song_comment_posted',
  'timeline_event_clicked',
  'feature_card_clicked',
  'directions_modal_opened',
  'kakao_map_opened',
  'game_started',
  'game_finished',
  'entry_draw_completed',
  'guestbook_message_posted',
  'nickname_set',
  'cta_clicked',
  'banner_impression',
  'modal_opened',
  'modal_closed',
  'back_navigation',
  'feature_access_denied',
  'abandoned_funnel_step',
  'button_click_no_follow',
  'core_feature_used',
  'nav_tab_clicked',
  'page_dwell_time',
]

export const CORE_FEATURES = ['setlist', 'chat', 'events', 'drink'] as const
export type CoreFeature = (typeof CORE_FEATURES)[number]
