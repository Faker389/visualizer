export interface AlertInterface{
    message: string
    type: "error" | "success" | "warning"
  }
  export interface Alert {
    id: string
    message: string
    type: 'error' | 'success' | 'warning'
  }
  export const getAlertStyles = (type: 'error' | 'success' | 'warning') => {
      switch (type) {
        case 'success':
          return 'bg-green-600 border-green-400'
        case 'warning':
          return 'bg-yellow-600 border-yellow-400'
        case 'error':
        default:
          return 'bg-red-600 border-red-400'
      }
    }

export type userInterface={
    id:string;
    authMethod:"google"|"password";
    email:string;
    photoURL?:string;
    name:string;
    veryfiedEmail:boolean;
};

export const normalize = (value?: string) =>
    value?.replace(/\s+/g, "").trim() || ""