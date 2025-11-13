
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import {
  FileText,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  MapPin,
  Globe,
  Eye,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Submission {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  // Category Selection
  country: string;
  stateRegion: string;
  tribe: string;
  village?: string;
  culturalDomain: string;
  title: string;
  // Content Description
  description: string;
  keywords: string[];
  language: string;
  dateOfRecording?: string;
  culturalSignificance?: string;
  // Content File
  contentFileType: string;
  contentUrl: string;
  // Consent
  consent: {
    fileType: string;
    fileUrl: string;
    consentType: string;
    consentNames: string;
    consentDate: string;
    permissionType: string[];
    duration: string;
    digitalSignature?: string;
  };
  // Access Classification
  accessTier: string;
  contentWarnings?: string[];
  warningOtherText?: string;
  // Additional Verification
  translationFileUrl?: string;
  backgroundInfo?: string;
  verificationDocUrl?: string;
  // Status
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  name?: string;
  email: string;
  createdAt: string;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "rejected" | "users"
  >("pending");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Check admin authentication
  useEffect(() => {
    const token =
      localStorage.getItem("adminToken") || localStorage.getItem("auth_token");
    if (!token) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else {
      fetchSubmissions(activeTab);
    }
  }, [activeTab]);

  const fetchSubmissions = async (status: string) => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/api/admin/submissions?status=${status}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.errors?.[0]?.msg || "Failed to fetch submissions"
        );
      }

      setSubmissions(data);
    } catch (error: any) {
      console.error("Fetch submissions error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("auth_token");
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.errors?.[0]?.msg || "Failed to fetch users");
      }

      setUsers(data);
    } catch (error: any) {
      console.error("Fetch users error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    setActionLoading(true);
    try {
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/api/admin/submissions/${submissionId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "approved" }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.errors?.[0]?.msg || "Failed to approve submission"
        );
      }

      toast({
        title: "Success",
        description: "Submission approved successfully",
      });

      // Refresh the list
      fetchSubmissions(activeTab);
    } catch (error: any) {
      console.error("Approve error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve submission",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/api/admin/submissions/${selectedSubmission._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "rejected",
            reason: rejectionReason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.errors?.[0]?.msg || "Failed to reject submission"
        );
      }

      toast({
        title: "Success",
        description: "Submission rejected successfully",
      });

      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedSubmission(null);

      // Refresh the list
      fetchSubmissions(activeTab);
    } catch (error: any) {
      console.error("Reject error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject submission",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (
    submissionId: string,
    submissionStatus: string
  ) => {
    if (
      !confirm(
        "Are you sure you want to delete this submission? This action cannot be undone."
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("auth_token");
      const response = await fetch(
        `${API_URL}/api/admin/submissions/${submissionStatus}/${submissionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.errors?.[0]?.msg || "Failed to delete submission"
        );
      }

      toast({
        title: "Success",
        description: "Submission deleted successfully",
      });

      // Refresh the list
      fetchSubmissions(activeTab);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("auth_token");
    navigate("/admin/login", { replace: true });
  };

  const renderFilePreview = (url: string, type: string) => {
    if (!url) {
      return (
        <div className="flex items-center justify-center p-8 bg-muted/20 rounded text-muted-foreground">
          <AlertCircle className="h-5 w-5 mr-2" />
          File not available
        </div>
      );
    }

    const isImage = type === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const isVideo = type === "video" || /\.(mp4|webm|mov)$/i.test(url);
    const isAudio = type === "audio" || /\.(mp3|wav|ogg)$/i.test(url);
    const isPdf = type === "text" || /\.pdf$/i.test(url); // ✅ Better PDF detection

    if (isImage) {
      return (
        <img
          src={url}
          alt="Content preview"
          className="w-full max-h-96 object-contain rounded-lg"
          onError={(e) => {
            e.currentTarget.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
          }}
        />
      );
    }

    if (isVideo) {
      return (
        <video src={url} controls className="w-full max-h-96 rounded-lg" />
      );
    }

    if (isAudio) {
      return <audio src={url} controls className="w-full" />;
    }

    if (isPdf) {
      // ✅ UPDATED: Better PDF viewer with multiple options
      return (
        <div className="space-y-4">
          {/* PDF Embed */}
          <div className="border rounded-lg overflow-hidden bg-gray-50">
            <iframe
              src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-96 border-0"
              title="PDF Preview"
              loading="lazy"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, "_blank")}
            >
              <Eye className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const link = document.createElement("a");
                link.href = url;
                link.download = "document.pdf";
                link.target = "_blank";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      );
    }

    // Generic file fallback
    return (
      <div className="flex flex-col items-center gap-4 p-8 bg-muted/20 rounded-lg">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Document File</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(url, "_blank")}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const link = document.createElement("a");
              link.href = url;
              link.download = "file";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    );
  };

  const renderSubmissionCard = (submission: Submission) => (
    <Card key={submission._id} className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{submission.title}</CardTitle>
            <CardDescription className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-3 w-3" />
                <span>
                  {typeof submission.userId === "object"
                    ? `${submission.userId.name} (${submission.userId.email})`
                    : "Unknown User"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3" />
                <span>{new Date(submission.createdAt).toLocaleString()}</span>
              </div>
            </CardDescription>
          </div>
          <Badge
            variant={
              submission.status === "approved"
                ? "default"
                : submission.status === "rejected"
                ? "destructive"
                : "secondary"
            }
          >
            {submission.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category Information */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Location & Domain
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{submission.country}</Badge>
            <Badge variant="outline">{submission.stateRegion}</Badge>
            <Badge variant="outline">{submission.tribe}</Badge>
            {submission.village && (
              <Badge variant="outline">{submission.village}</Badge>
            )}
            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
              {submission.culturalDomain}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Description</h4>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {submission.description}
          </p>
        </div>

        {/* Keywords */}
        {submission.keywords && submission.keywords.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {submission.keywords.map((keyword, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Language & Date */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">Language:</span>{" "}
            {submission.language}
          </div>
          {submission.dateOfRecording && (
            <div>
              <span className="font-semibold">Recorded:</span>{" "}
              {new Date(submission.dateOfRecording).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Content Preview */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">
            Content ({submission.contentFileType})
          </h4>
          {renderFilePreview(submission.contentUrl, submission.contentFileType)}
        </div>

        {/* Consent Information */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg space-y-2">
          <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Consent Information
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-semibold">Type:</span>{" "}
              {submission.consent.consentType}
            </div>
            <div>
              <span className="font-semibold">Names:</span>{" "}
              {submission.consent.consentNames}
            </div>
            <div>
              <span className="font-semibold">Date:</span>{" "}
              {new Date(submission.consent.consentDate).toLocaleDateString()}
            </div>
            <div>
              <span className="font-semibold">Duration:</span>{" "}
              {submission.consent.duration}
            </div>
          </div>
          <div className="text-xs">
            <span className="font-semibold">Permissions:</span>{" "}
            {submission.consent.permissionType.join(", ")}
          </div>
          {submission.consent.fileUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => window.open(submission.consent.fileUrl, "_blank")}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Consent Document
            </Button>
          )}
        </div>

        {/* Access Tier & Warnings */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Access & Warnings</h4>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                submission.accessTier === "Public"
                  ? "default"
                  : submission.accessTier === "Restricted"
                  ? "secondary"
                  : "destructive"
              }
            >
              {submission.accessTier}
            </Badge>
            {submission.contentWarnings &&
              submission.contentWarnings.map((warning, idx) => (
                <Badge key={idx} variant="outline" className="text-orange-600">
                  ⚠️ {warning}
                </Badge>
              ))}
          </div>
        </div>

        {/* Additional Files */}
        {(submission.translationFileUrl || submission.verificationDocUrl) && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Additional Documents</h4>
            <div className="flex flex-wrap gap-2">
              {submission.translationFileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(submission.translationFileUrl, "_blank")
                  }
                >
                  Translation
                </Button>
              )}
              {submission.verificationDocUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(submission.verificationDocUrl, "_blank")
                  }
                >
                  Verification Doc
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Background Info */}
        {submission.backgroundInfo && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Background Information</h4>
            <p className="text-sm text-muted-foreground">
              {submission.backgroundInfo}
            </p>
          </div>
        )}

        {/* Cultural Significance */}
        {submission.culturalSignificance && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Cultural Significance</h4>
            <p className="text-sm text-muted-foreground">
              {submission.culturalSignificance}
            </p>
          </div>
        )}

        {/* Rejection Reason */}
        {submission.status === "rejected" && submission.rejectionReason && (
          <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
              Rejection Reason
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300">
              {submission.rejectionReason}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {submission.status === "pending" && (
            <>
              <Button
                className="flex-1"
                onClick={() => handleApprove(submission._id)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setSelectedSubmission(submission);
                  setRejectDialogOpen(true);
                }}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {(submission.status === "approved" ||
            submission.status === "rejected") && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleDelete(submission._id, submission.status)}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderUserCard = (user: User) => (
    <Card key={user._id}>
      <CardHeader>
        <CardTitle>{user.name || "Unnamed User"}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold text-primary">
            Admin Dashboard
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="pending">
              Pending
              {!loading &&
                submissions.length > 0 &&
                activeTab === "pending" && (
                  <Badge variant="secondary" className="ml-2">
                    {submissions.length}
                  </Badge>
                )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <div className="mt-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <TabsContent value="pending" className="space-y-6">
                  {submissions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No pending submissions
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {submissions.map(renderSubmissionCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="approved" className="space-y-6">
                  {submissions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No approved submissions
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {submissions.map(renderSubmissionCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="rejected" className="space-y-6">
                  {submissions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No rejected submissions
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {submissions.map(renderSubmissionCard)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="users" className="space-y-6">
                  {users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {users.map(renderUserCard)}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </main>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this submission. This will
              be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setSelectedSubmission(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Submission"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Admin;
