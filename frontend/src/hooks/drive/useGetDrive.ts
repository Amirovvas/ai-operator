import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";

interface IResponse {
  message: string;
  data: IDriveFile[];
}

export interface IDriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
  starred?: boolean;
  owners?: { displayName?: string }[];
}

export const useGetDrive = () =>
  useQuery({
    queryKey: ["drive-files"],
    queryFn: async () => {
      const res = await api.get<IResponse>("/auth/drive");

      return res.data.data;
    },
  });
