export interface Comment {
  id: string;
  site_id?: string;
  position_x: number;
  position_y: number;
  selector: string;
  content: string;
  status: 'open' | 'resolved';
  browser_info?: string;
  created_by?: string;
  author_name?: string;
  comment_number?: number;
  created_at?: string;
  updated_at?: string;
  timestamp?: number;
  viewport?: 'desktop' | 'mobile';
}

export interface Site {
  id: string;
  url: string;
  created_by?: string;
  screenshot_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SiteShare {
  id: string;
  site_id: string;
  guest_email: string;
  guest_user_id: string | null;
  invited_by: string;
  created_at: string;
}

export interface ClickData {
  x: number;
  y: number;
  selector: string;
  element: string;
  timestamp: number;
}
