
import { useState, useEffect, useCallback, useRef } from 'react';

// Specify the types for the gapi and google objects from the loaded scripts
declare const gapi: any;
declare const google: any;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'scc_backup.json';

let tokenClient: any;

export const useGoogleDrive = () => {
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(localStorage.getItem('driveFileId'));
  const scriptsLoadedRef = useRef(false);

  const findOrCreateBackupFile = useCallback(async () => {
    let currentFileId = localStorage.getItem('driveFileId');
    if (currentFileId) return currentFileId;
    
    try {
      const response = await gapi.client.drive.files.list({
        q: `name='${BACKUP_FILE_NAME}' and 'root' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.result.files.length > 0) {
        const foundFileId = response.result.files[0].id;
        localStorage.setItem('driveFileId', foundFileId);
        setDriveFileId(foundFileId);
        return foundFileId;
      } else {
        const fileMetadata = {
          name: BACKUP_FILE_NAME,
          mimeType: 'application/json',
          parents: ['root']
        };
        const createResponse = await gapi.client.drive.files.create({
          resource: fileMetadata,
          fields: 'id'
        });
        const newFileId = createResponse.result.id;
        localStorage.setItem('driveFileId', newFileId);
        setDriveFileId(newFileId);
        return newFileId;
      }
    } catch (err: any) {
        console.error("Error finding/creating backup file:", err);
        setDriveError("Could not access or create backup file in Google Drive.");
        return null;
    }
  }, []);

  const gapiLoaded = useCallback(() => {
    gapi.client.init({
      discoveryDocs: [DISCOVERY_DOC],
    }).catch((err: any) => {
      console.error("Error initializing gapi client", err);
      setDriveError("Failed to initialize Google API client.");
    });
  }, []);

  const gisLoaded = useCallback(() => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp: any) => {
        if (resp.error !== undefined) {
          console.error(resp);
          setDriveError("Google authentication failed.");
          return;
        }
        setIsDriveConnected(true);
        setDriveError(null);
        await findOrCreateBackupFile();
      },
    });
  }, [findOrCreateBackupFile]);

  useEffect(() => {
    // Prevent scripts from being loaded multiple times, e.g., in React.StrictMode
    if (scriptsLoadedRef.current) {
        return;
    }
    scriptsLoadedRef.current = true;
    
    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = () => gapi.load('client', gapiLoaded);
    document.body.appendChild(scriptGapi);

    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = gisLoaded;
    document.body.appendChild(scriptGis);

  }, [gapiLoaded, gisLoaded]);

  const handleDriveConnect = () => {
    if (!tokenClient) {
        setDriveError("Google client is not ready. Please try again in a moment.");
        return;
    }
    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      tokenClient.requestAccessToken({prompt: ''});
    }
  };

  const saveToDrive = async (data: any) => {
    if (!isDriveConnected) return;

    let fileId = driveFileId || localStorage.getItem('driveFileId');
    if (!fileId) {
        fileId = await findOrCreateBackupFile();
    }
    if (!fileId) return;

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json'
    };
    
    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(data, null, 2) +
        close_delim;
    
    try {
      await gapi.client.request({
          path: `/upload/drive/v3/files/${fileId}`,
          method: 'PATCH',
          params: { uploadType: 'multipart' },
          headers: {
              'Content-Type': 'multipart/related; boundary="' + boundary + '"'
          },
          body: multipartRequestBody
      });
      console.log('Successfully saved to Google Drive.');
      setDriveError(null);
    } catch(err: any) {
        console.error("Error saving to Google Drive:", err);
        setDriveError("Failed to save data. Check console for details.");
    }
  };

  return { isDriveConnected, driveError, handleDriveConnect, saveToDrive };
};