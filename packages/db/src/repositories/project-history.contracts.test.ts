import type { Connection } from "mongoose";
import { createProjectHistoryRepository, createProjectRepository } from "../index";

declare const connection: Connection;

const projectRepository = createProjectRepository(connection);
const projectHistoryRepository = createProjectHistoryRepository(connection);

void projectRepository;
void projectHistoryRepository;