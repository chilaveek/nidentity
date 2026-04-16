using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace server_dotnet.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportAndModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:design_status", "draft,moderation,published,rejected")
                .Annotation("Npgsql:Enum:order_status", "new,printing,shipped,delivered,cancelled")
                .Annotation("Npgsql:Enum:product_type", "t_shirt,hoodie")
                .Annotation("Npgsql:Enum:user_role", "user,author,admin")
                .OldAnnotation("Npgsql:Enum:design_status", "draft,moderation,published")
                .OldAnnotation("Npgsql:Enum:order_status", "new,printing,shipped,delivered,cancelled")
                .OldAnnotation("Npgsql:Enum:product_type", "t_shirt,hoodie")
                .OldAnnotation("Npgsql:Enum:user_role", "user,author,admin");

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "designs",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "support_tickets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Subject = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false, defaultValue: "Open"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_tickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_support_tickets_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "support_messages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TicketId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_support_messages_support_tickets_TicketId",
                        column: x => x.TicketId,
                        principalTable: "support_tickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_support_messages_users_SenderId",
                        column: x => x.SenderId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_support_messages_SenderId",
                table: "support_messages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "ix_support_messages_ticket_id",
                table: "support_messages",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "ix_support_tickets_user_id",
                table: "support_tickets",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "support_messages");

            migrationBuilder.DropTable(
                name: "support_tickets");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "designs");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:design_status", "draft,moderation,published")
                .Annotation("Npgsql:Enum:order_status", "new,printing,shipped,delivered,cancelled")
                .Annotation("Npgsql:Enum:product_type", "t_shirt,hoodie")
                .Annotation("Npgsql:Enum:user_role", "user,author,admin")
                .OldAnnotation("Npgsql:Enum:design_status", "draft,moderation,published,rejected")
                .OldAnnotation("Npgsql:Enum:order_status", "new,printing,shipped,delivered,cancelled")
                .OldAnnotation("Npgsql:Enum:product_type", "t_shirt,hoodie")
                .OldAnnotation("Npgsql:Enum:user_role", "user,author,admin");
        }
    }
}
