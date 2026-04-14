import React from 'react';
interface LicenseInputScreenProps {
    onActivate: (licenseKey: string) => Promise<void>;
    onSkip?: () => void;
    error?: string;
}
export declare const LicenseInputScreen: React.FC<LicenseInputScreenProps>;
export default LicenseInputScreen;
