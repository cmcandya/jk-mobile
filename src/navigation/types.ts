export type Site = {
  id: string;
  site_name: string;
  job_number: string | null;
  address: string | null;
  status: string | null;
};

export type RootStackParamList = {
  SiteList: undefined;
  SiteDetail: { site: Site };
  PlanViewer: {
    sheetId: string;
    sheetNumber: string | null;
    title: string | null;
    thumbnailUrl: string | null;
    /** Ordered sheet IDs for prev/next navigation */
    sortedIds: string[];
    render: {
      dziPath: string;
      tileFormat: string;
      tileSize: number;
      overlap: number;
      widthPx: number;
      heightPx: number;
      levelCount: number;
    } | null;
  };
};
