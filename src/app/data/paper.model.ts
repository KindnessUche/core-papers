/**
 * Shapes returned by CORE's `GET /v3/search/works`.
 *
 * Research metadata is sparse, so almost every field is optional: any card or chart that
 * reads a paper has to cope with a missing abstract, year or author list.
 */
export interface Author {
  name?: string;
}

export interface Journal {
  title?: string;
  identifiers?: string[];
}

export interface DataProvider {
  id?: number;
  name?: string;
  url?: string;
}

export interface Paper {
  id: number | string;
  title?: string | null;
  abstract?: string | null;
  authors?: Author[];
  yearPublished?: number | null;
  publishedDate?: string | null;
  doi?: string | null;
  downloadUrl?: string | null;
  publisher?: string | null;
  journals?: Journal[];
  documentType?: string | null;
  citationCount?: number | null;
  language?: { code?: string; name?: string } | null;
  fieldOfStudy?: string | null;
  contributors?: string[];
  dataProviders?: DataProvider[];
  links?: { type?: string; url?: string }[];
}

export interface SearchResponse {
  totalHits: number;
  limit: number;
  offset: number;
  results: Paper[];
  searchId?: string;
}
