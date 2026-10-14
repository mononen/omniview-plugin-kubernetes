export type IdAccessor = string | ((data: object) => string);

export type ColumnMeta = {
  meta?: {
    flex?: number;
  };
};
