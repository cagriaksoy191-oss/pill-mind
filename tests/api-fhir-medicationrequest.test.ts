import { POST } from "../app/api/fhir/medicationrequest/route";
import {
  findInteractionsDB,
  checkAccumulationDB,
  findFoodInteractionsDB,
  findContraindicationsDB,
  resolveDrugsDB
} from "@/lib/interactions";

jest.mock("@/lib/interactions", () => ({
  findInteractionsDB: jest.fn(),
  checkAccumulationDB: jest.fn(),
  findFoodInteractionsDB: jest.fn(),
  findContraindicationsDB: jest.fn(),
  resolveDrugsDB: jest.fn(),
}));

describe("POST /api/fhir/medicationrequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 OperationOutcome if drugIds length is less than 2", async () => {
    const req = new Request("http://localhost/api/fhir/medicationrequest", {
      method: "POST",
      body: JSON.stringify({
        resourceType: "Parameters",
        parameter: [
          {
            name: "medications",
            valueString: "drug-1"
          }
        ]
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.resourceType).toBe("OperationOutcome");
    expect(data.issue[0].severity).toBe("warning");
  });

  it("should parse FHIR Parameters and return 200 with Parameters format", async () => {
    (resolveDrugsDB as jest.Mock).mockResolvedValueOnce({});
    (findInteractionsDB as jest.Mock).mockResolvedValueOnce([{ severity: "high" }]);
    (checkAccumulationDB as jest.Mock).mockResolvedValueOnce([]);
    (findFoodInteractionsDB as jest.Mock).mockResolvedValueOnce([]);
    (findContraindicationsDB as jest.Mock).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/fhir/medicationrequest", {
      method: "POST",
      body: JSON.stringify({
        resourceType: "Parameters",
        parameter: [
          {
            name: "medications",
            valueString: "drug-1, drug-2"
          },
          {
            name: "patientContext",
            valueString: JSON.stringify({ age: 40 })
          }
        ]
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.resourceType).toBe("Parameters");

    const interactionsCountParam = data.parameter.find((p: any) => p.name === "interactionsCount");
    expect(interactionsCountParam.valueInteger).toBe(1);

    expect(resolveDrugsDB).toHaveBeenCalledWith(["drug-1", "drug-2"]);
    expect(findContraindicationsDB).toHaveBeenCalledWith(["drug-1", "drug-2"], { age: 40 }, {});
  });

  it("should handle patientContext parse error gracefully", async () => {
    (resolveDrugsDB as jest.Mock).mockResolvedValueOnce({});
    (findInteractionsDB as jest.Mock).mockResolvedValueOnce([]);
    (checkAccumulationDB as jest.Mock).mockResolvedValueOnce([]);
    (findFoodInteractionsDB as jest.Mock).mockResolvedValueOnce([]);
    (findContraindicationsDB as jest.Mock).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/fhir/medicationrequest", {
      method: "POST",
      body: JSON.stringify({
        resourceType: "Parameters",
        parameter: [
          {
            name: "medications",
            valueString: "drug-1, drug-2"
          },
          {
            name: "patientContext",
            valueString: "invalid-json"
          }
        ]
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(findContraindicationsDB).toHaveBeenCalledWith(["drug-1", "drug-2"], undefined, {});
  });

  it("should parse FHIR Bundle of MedicationRequests", async () => {
    (resolveDrugsDB as jest.Mock).mockResolvedValueOnce({});
    (findInteractionsDB as jest.Mock).mockResolvedValueOnce([]);
    (checkAccumulationDB as jest.Mock).mockResolvedValueOnce([]);
    (findFoodInteractionsDB as jest.Mock).mockResolvedValueOnce([]);
    (findContraindicationsDB as jest.Mock).mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/fhir/medicationrequest", {
      method: "POST",
      body: JSON.stringify({
        resourceType: "Bundle",
        entry: [
          {
            resource: {
              resourceType: "MedicationRequest",
              medicationReference: { reference: "Medication/drug-1" }
            }
          },
          {
            resource: {
              resourceType: "MedicationRequest",
              medicationCodeableConcept: { text: "Drug-2" }
            }
          }
        ]
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(resolveDrugsDB).toHaveBeenCalledWith(["drug-1", "drug-2"]);
  });

  it("should parse single MedicationRequest (returns 400 because < 2 drugs)", async () => {
    const req = new Request("http://localhost/api/fhir/medicationrequest", {
      method: "POST",
      body: JSON.stringify({
        resourceType: "MedicationRequest",
        medicationReference: { reference: "Medication/drug-1" }
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 500 if an error occurs during processing", async () => {
    (resolveDrugsDB as jest.Mock).mockRejectedValueOnce(new Error("Database error"));

    const req = new Request("http://localhost/api/fhir/medicationrequest", {
      method: "POST",
      body: JSON.stringify({
        resourceType: "Parameters",
        parameter: [
          {
            name: "medications",
            valueString: "drug-1, drug-2"
          }
        ]
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.resourceType).toBe("OperationOutcome");
    expect(data.issue[0].diagnostics).toBe("Database error");
  });

  it("should return 500 if JSON parsing of request body fails", async () => {
    const req = new Request("http://localhost/api/fhir/medicationrequest", {
      method: "POST",
      body: "invalid-json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
  });
});
