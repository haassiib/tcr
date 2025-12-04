import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { packageSchema, packageUpdateSchema } from '@/lib/zod-schemas';

export interface IPackage {
  id: number;
  sort_order: number;
  package_type: number;
  title: string;
  headline: string;
  image: string | null;
  price: number;
  discount: number | null;
  duration: string | null;
  group_size: number;
  location: string;
  page_url: string | null;
  created: Date;
}

export interface IPackageResponse {
  packages: IPackage[];
  totalPages: number;
}


export class PackageModel {

  static async create(data: Prisma.PackageCreateInput): Promise<IPackage> {
    const validatedData = packageSchema.parse(data);
    return prisma.package.create({
      data: validatedData,
    });
  }
  
  static async findById(id: number): Promise<IPackage | null> {
    return prisma.package.findUnique({
      where: { id },
    });
  }

  static async findByType(type: number): Promise<IPackage[]> {
    return prisma.package.findMany({
      where: { package_type: type },
      orderBy: { sort_order: 'asc' },
    });
  }

  static async findByQuery(type: string, page: string, limit: string, query: string): Promise<IPackageResponse> {
    const where: any = {};
    const currentPage = page ? parseInt(page, 10) : 1;
    const packagesPerPage = limit ? parseInt(limit, 10) : 6;

    if (type) {
      where.package_type = parseInt(type, 10);
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { headline: { contains: query } },
        { location: { contains: query } },
      ];
    }

    const totalPackages = await prisma.package.count({ where });
    const totalPages = Math.ceil(totalPackages / packagesPerPage);
    const skip = (currentPage - 1) * packagesPerPage;
    const packages = await prisma.package.findMany({
      where,
      skip: skip,
      take: packagesPerPage,
      orderBy: { sort_order: 'asc' },
    });
    return { packages, totalPages };
  }

  static async findAll(): Promise<IPackage[]> {
    return prisma.package.findMany({
      orderBy: { sort_order: 'asc' },
    });
  }

  static async update(id: number, data: Prisma.PackageUpdateInput): Promise<IPackage> {
    const validatedData = packageUpdateSchema.parse(data);
    return prisma.package.update({
      where: { id },
      data: validatedData,
    });
  }

  static async delete(id: number): Promise<IPackage> {
    return prisma.package.delete({
      where: { id },
    });
  }
}