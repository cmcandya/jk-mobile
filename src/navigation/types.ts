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
};
