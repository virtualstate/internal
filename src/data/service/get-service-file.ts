import {File} from "../file";
import {listServices, ListServicesInput} from "./list-services";
import {getResolvedNamedFile, listResolvedNamedFiles} from "../file";
import {
    GetResolvedNamedFileOptions,
    ListResolvedNamedFileOptions
} from "../file";

export interface GetServiceFileListOptions {
    accept?: string;
    public?: boolean;
}

export interface ListServiceFilesOptions extends GetServiceFileListOptions, ListServicesInput, GetResolvedNamedFileOptions {

}

export async function listServiceFiles(options?: ListServiceFilesOptions): Promise<File[]> {
    const services = await listServices(options);
    const serviceFiles = await Promise.all(
        services.map(service => getServiceFile(service.serviceId, options))
    );
    return serviceFiles.filter(Boolean);
}

export async function getServiceFiles(serviceId: string, options: ListResolvedNamedFileOptions = {}): Promise<File[]> {
    return listResolvedNamedFiles("service", serviceId, options);
}

export async function getServiceFile(serviceId: string, options: GetResolvedNamedFileOptions = {}): Promise<File | undefined> {
    return getResolvedNamedFile("service", serviceId, options)
}